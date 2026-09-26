/**
 * ATC/1.0 Spec Verifier — self-contained, no external crypto deps
 * =================================================================
 *
 * This is the canonical ATC/1.0 conformance verifier. It accepts ANY
 * Agent Trust Card (regardless of issuer — MarketNow Sentinel CA, a
 * third-party CA, or a self-signed test CA) and verifies:
 *
 *   - ATC-001 Identity          (structural)
 *   - ATC-002 Attestation        (structural + crypto)
 *   - ATC-003 Capabilities       (structural + enum validation)
 *   - ATC-004 Evidence           (structural)
 *   - ATC-005 Risk               (structural + range)
 *   - ATC-006 Signature          (Ed25519 + RFC 8785 JCS + SHA-256)
 *   - ATC-007 Revocation         (structural + fail-closed enforcement in TRUST mode)
 *   - ATC-008 Expiration         (date window)
 *
 * Optional controls ATC-009 (Delegation) and ATC-010 (Runtime Trust)
 * are parsed if present but do not affect the verdict.
 *
 * ─── SECURITY MODEL (v1.11.0 — fail-closed trust verification) ──────────────
 *
 * v1.10.x accepted the CA verification key from the document under
 * verification (atc.issuer.ca_public_key) when the caller did not supply
 * one. That is a security footgun: a malicious card can ship the very key
 * that verifies its own signature, yielding a cryptographically valid but
 * meaningless result. v1.11.0 separates the two verification intents:
 *
 *   TRUST mode (DEFAULT, fail-closed)
 *     verifyATC(atc, { trusted_ca: <base64 SPKI> })
 *     verifyTrust(atc, { trusted_ca, revocation_status })
 *     - trusted_ca is REQUIRED. Missing trusted_ca → CONFIGURATION_ERROR
 *       (ATC-006 fails, valid:false). The verifier NEVER falls back to
 *       atc.issuer.ca_public_key on this path.
 *     - ATC-007 fail-closed: if revocation_check_required=true, the caller
 *       MUST supply revocation evidence via options.revocation_status
 *       (pre-fetched list or simple status). No evidence → DENY. A valid
 *       signature on a revoked card must never return valid:true.
 *
 *   SELF_DESCRIBED mode (explicit opt-in, NOT a trust decision)
 *     verifyATC(atc, { mode: 'self_described' })
 *     verifySelfDescribedSignature(atc)
 *     - For debugging/interop only: verifies the signature math against
 *       the CA key embedded in the document. Result carries
 *       verification_mode:'SELF_DESCRIBED', trust_decision:'NOT_APPLICABLE'
 *       and an explicit warning that a malicious card can carry its own
 *       key. It is impossible to confuse with a trust decision.
 *
 * The verifier returns a structured result:
 *   {
 *     valid: boolean,             // TRUST mode: full trust pipeline result
 *     verification_mode: 'TRUST' | 'SELF_DESCRIBED',
 *     trust_decision: 'TRUST' | 'DENY' | 'NOT_APPLICABLE',
 *     spec_version: string,
 *     controls_passed: string[],   // e.g. ['ATC-001', 'ATC-002', ...]
 *     controls_failed: string[],
 *     errors: string[],
 *     warnings: string[],
 *     card_id: string,
 *     issuer_ca_id: string,
 *     trust_score: integer | null,
 *     risk_level: string | null,
 *     expires_at: string | null,
 *   }
 *
 * License: MNNC-1.0 (AliceLabs LLC Proprietary)
 * Spec: https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/docs/atc-spec/SPEC.md
 */

import {
  createPublicKey,
  createHash,
  verify as edVerify,
} from 'node:crypto';
import canonicalize from 'canonicalize';

// ─── Constants ────────────────────────────────────────────────────────────────
const ATC_SPEC_VERSION = 'ATC/1.0';
const ATC_ALGORITHM = 'Ed25519';

const CARD_ID_PATTERN = /^ATC-\d{4}-\d{6,}$/;
// Ed25519 public keys can be:
//   - Raw 32 bytes (43 base64 chars + 1 padding = 44 chars)
//   - SPKI-wrapped (44 DER bytes → 60 base64 chars incl. padding, no '=' at end if length is divisible by 3)
// Accept any base64 string of length 43-90 chars (covers both formats + future algos)
const BASE64_ED25519_PUBLIC_KEY = /^[A-Za-z0-9+/]{43,90}={0,2}$/;
// Ed25519 signatures are always 64 raw bytes → 86 base64 chars + 2 padding '='
// But other algos (ML-DSA in v1.1) will produce longer signatures; accept up to 200 chars
const BASE64_SIGNATURE = /^[A-Za-z0-9+/]{86,400}={0,3}$/;
const HEX_SHA256 = /^[a-f0-9]{64}$/;

const CAPABILITY_ENUMS = {
  filesystem: {
    read: ['none', 'own_dir', 'temp_dir', 'home_dir', 'system', 'all'],
    write: ['none', 'own_dir', 'temp_dir', 'home_dir', 'system', 'all'],
  },
  network: {
    egress: ['none', 'allowlist', 'all'],
    ingress: ['none', 'bound_ports', 'all'],
  },
  shell: {
    exec: ['none', 'sandboxed', 'unrestricted'],
    spawn: ['none', 'sandboxed', 'unrestricted'],
  },
  credentials: {
    read_env: ['none', 'allowlist', 'all'],
    read_files: ['none', 'allowlist', 'all'],
  },
  process: {
    subprocess: ['none', 'sandboxed', 'unrestricted'],
    signals: ['none', 'own', 'all'],
  },
};

const REQUIRED_CONTROLS = [
  'ATC-001', 'ATC-002', 'ATC-003', 'ATC-004',
  'ATC-005', 'ATC-006', 'ATC-007', 'ATC-008',
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function isObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasFields(obj, fields) {
  return fields.every(f => obj && Object.prototype.hasOwnProperty.call(obj, f));
}

// ─── Compute the signature payload (RFC 8785 JCS) ────────────────────────────
// Per ATC-006:
//   1. Take the full ATC JSON document
//   2. Set `attestation.signature = ""` AND `attestation.signed_payload_hash = ""`
//      (both are part of the envelope, not the signed payload)
//   3. Apply RFC 8785 JCS
//   4. Compute SHA-256 → hex
function computeSignaturePayload(atc) {
  const payload = JSON.parse(JSON.stringify(atc));
  if (!payload.attestation) payload.attestation = {};
  payload.attestation.signature = '';
  payload.attestation.signed_payload_hash = '';
  return canonicalize(payload);
}

function computePayloadHash(atc) {
  return createHash('sha256').update(computeSignaturePayload(atc)).digest('hex');
}

// ─── Per-control checks ────────────────────────────────────────────────────

function check_ATC_001_identity(atc) {
  const errors = [];
  const warnings = [];
  const id = atc.identity || {};

  if (!isObject(atc.identity)) {
    errors.push('ATC-001: identity must be an object');
    return { errors, warnings };
  }
  if (!hasFields(id, ['agent_id', 'agent_name', 'agent_owner'])) {
    errors.push('ATC-001: identity must include agent_id, agent_name, agent_owner');
  }
  if (typeof id.agent_id !== 'string' || id.agent_id.length < 3 || id.agent_id.length > 128) {
    errors.push('ATC-001: identity.agent_id must be 3-128 chars');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(id.agent_id)) {
    errors.push('ATC-001: identity.agent_id must be alphanumeric + hyphens/underscores only');
  }
  if (typeof id.agent_name !== 'string' || id.agent_name.length < 1 || id.agent_name.length > 100) {
    errors.push('ATC-001: identity.agent_name must be 1-100 chars');
  }
  if (typeof id.agent_owner !== 'string' || id.agent_owner.length < 1 || id.agent_owner.length > 100) {
    errors.push('ATC-001: identity.agent_owner must be 1-100 chars');
  }
  if (id.owner_contact !== undefined) {
    if (typeof id.owner_contact !== 'string' || (!id.owner_contact.startsWith('mailto:') && !id.owner_contact.startsWith('https:'))) {
      warnings.push('ATC-001: identity.owner_contact should be a mailto: or https: URL');
    }
  }
  return { errors, warnings };
}

function check_ATC_002_attestation(atc) {
  const errors = [];
  const warnings = [];
  const att = atc.attestation || {};

  if (!isObject(atc.attestation)) {
    errors.push('ATC-002: attestation must be an object');
    return { errors, warnings };
  }
  if (!hasFields(att, ['subject_public_key', 'subject_algorithm', 'signature', 'signed_payload_hash'])) {
    errors.push('ATC-002: attestation must include subject_public_key, subject_algorithm, signature, signed_payload_hash');
  }
  if (att.subject_algorithm !== ATC_ALGORITHM) {
    errors.push(`ATC-002: subject_algorithm must be '${ATC_ALGORITHM}' (got ${att.subject_algorithm})`);
  }
  if (att.ca_algorithm && att.ca_algorithm !== ATC_ALGORITHM) {
    errors.push(`ATC-002: ca_algorithm must be '${ATC_ALGORITHM}' (got ${att.ca_algorithm})`);
  }
  if (typeof att.subject_public_key === 'string' && !BASE64_ED25519_PUBLIC_KEY.test(att.subject_public_key)) {
    errors.push('ATC-002: attestation.subject_public_key is not a valid base64 Ed25519 SPKI key');
  }
  if (typeof att.signature === 'string' && !BASE64_SIGNATURE.test(att.signature)) {
    errors.push('ATC-002: attestation.signature is not a valid base64 Ed25519 signature');
  }
  if (typeof att.signed_payload_hash === 'string' && !HEX_SHA256.test(att.signed_payload_hash)) {
    errors.push('ATC-002: attestation.signed_payload_hash is not a valid hex SHA-256');
  }
  return { errors, warnings };
}

function check_ATC_003_capabilities(atc) {
  const errors = [];
  const warnings = [];
  const caps = atc.capabilities || {};

  if (!isObject(atc.capabilities)) {
    errors.push('ATC-003: capabilities must be an object');
    return { errors, warnings };
  }

  for (const [category, subFields] of Object.entries(CAPABILITY_ENUMS)) {
    if (!isObject(caps[category])) {
      errors.push(`ATC-003: capabilities.${category} must be an object`);
      continue;
    }
    for (const [field, allowedValues] of Object.entries(subFields)) {
      const v = caps[category][field];
      if (v === undefined) {
        errors.push(`ATC-003: capabilities.${category}.${field} is missing`);
      } else if (typeof v !== 'string' || !allowedValues.includes(v)) {
        errors.push(`ATC-003: capabilities.${category}.${field} must be one of: ${allowedValues.join(', ')} (got ${JSON.stringify(v)})`);
      }
    }
  }
  return { errors, warnings };
}

function check_ATC_004_evidence(atc) {
  const errors = [];
  const warnings = [];
  const ev = atc.evidence || {};

  if (!isObject(atc.evidence)) {
    errors.push('ATC-004: evidence must be an object');
    return { errors, warnings };
  }
  if (!hasFields(ev, ['audit_pipeline', 'audit_completed_at', 'static_checks', 'dynamic_checks', 'runtime_checks', 'findings'])) {
    errors.push('ATC-004: evidence must include audit_pipeline, audit_completed_at, static_checks, dynamic_checks, runtime_checks, findings');
  }
  if (ev.audit_completed_at !== undefined) {
    const dt = Date.parse(ev.audit_completed_at);
    if (isNaN(dt)) errors.push('ATC-004: evidence.audit_completed_at is not a valid ISO 8601 timestamp');
  }
  if (Array.isArray(ev.findings)) {
    for (let i = 0; i < ev.findings.length; i++) {
      const f = ev.findings[i];
      if (!isObject(f)) {
        errors.push(`ATC-004: evidence.findings[${i}] must be an object`);
        continue;
      }
      if (!hasFields(f, ['layer', 'rule_id', 'severity', 'description'])) {
        errors.push(`ATC-004: evidence.findings[${i}] must include layer, rule_id, severity, description`);
      }
      if (f.severity && !['info', 'low', 'medium', 'high', 'critical'].includes(f.severity)) {
        errors.push(`ATC-004: evidence.findings[${i}].severity must be info/low/medium/high/critical (got ${f.severity})`);
      }
    }
  }
  return { errors, warnings };
}

function check_ATC_005_risk(atc) {
  const errors = [];
  const warnings = [];
  const r = atc.risk || {};

  if (!isObject(atc.risk)) {
    errors.push('ATC-005: risk must be an object');
    return { errors, warnings };
  }
  if (!hasFields(r, ['trust_score', 'risk_level', 'decision_authority', 'score_explanation', 'scored_at'])) {
    errors.push('ATC-005: risk must include trust_score, risk_level, decision_authority, score_explanation, scored_at');
  }
  if (typeof r.trust_score !== 'number' || !Number.isInteger(r.trust_score) || r.trust_score < 0 || r.trust_score > 10) {
    errors.push('ATC-005: risk.trust_score must be an integer 0-10');
  } else {
    // Verify risk_level matches trust_score
    const expected = r.trust_score >= 8 ? 'low' : r.trust_score >= 5 ? 'medium' : r.trust_score >= 2 ? 'high' : 'critical';
    if (r.risk_level && r.risk_level !== expected) {
      warnings.push(`ATC-005: risk.risk_level='${r.risk_level}' but trust_score=${r.trust_score} implies '${expected}'`);
    }
  }
  if (r.risk_level && !['low', 'medium', 'high', 'critical'].includes(r.risk_level)) {
    errors.push(`ATC-005: risk.risk_level must be low/medium/high/critical (got ${r.risk_level})`);
  }
  // ATC/1.0 mandates decision_authority = 'consumer'
  if (r.decision_authority && r.decision_authority !== 'consumer') {
    errors.push(`ATC-005: risk.decision_authority must be 'consumer' in ATC/1.0 (got ${r.decision_authority})`);
  }
  return { errors, warnings };
}

function check_ATC_006_signature(atc, caPublicKeyBase64) {
  const errors = [];
  const warnings = [];

  // 1. Compute the canonical payload
  let canonical;
  try {
    canonical = computeSignaturePayload(atc);
  } catch (err) {
    errors.push(`ATC-006: canonicalization failed: ${err.message}`);
    return { errors, warnings };
  }

  // 2. Verify the payload hash matches what's stored
  const computedHash = createHash('sha256').update(canonical).digest('hex');
  if (computedHash !== atc.attestation?.signed_payload_hash) {
    errors.push(`ATC-006: signed_payload_hash mismatch — expected ${computedHash.slice(0, 16)}..., got ${(atc.attestation?.signed_payload_hash || '').slice(0, 16)}...`);
  }

  // 3. The CA public key MUST be supplied by the caller (out-of-band trust
  //    anchor). SECURITY (v1.11.0): never fall back to atc.issuer.ca_public_key
  //    here — the document under verification is untrusted input; a key
  //    embedded in it cannot anchor its own signature. Mode resolution
  //    (trusted vs self-described) happens in verifyATC(), which decides
  //    WHICH key is passed into this function.
  const caKey = caPublicKeyBase64;
  if (!caKey) {
    errors.push("ATC-006: CONFIGURATION_ERROR — no trusted CA public key supplied. Obtain the CA key out-of-band from the issuer's official channel and pass it via options.trusted_ca. For debugging/interop only, use mode:'self_described' or verifySelfDescribedSignature() — that result is NOT a trust decision.");
    return { errors, warnings };
  }

  // 4. Verify the Ed25519 signature
  let signatureValid = false;
  try {
    const caPublicKeyObj = createPublicKey({
      key: Buffer.from(caKey, 'base64'),
      format: 'der',
      type: 'spki',
    });
    signatureValid = edVerify(
      null,
      Buffer.from(canonical, 'utf8'),
      caPublicKeyObj,
      Buffer.from(atc.attestation.signature, 'base64')
    );
  } catch (err) {
    errors.push(`ATC-006: signature verification threw: ${err.message}`);
  }

  if (!signatureValid) {
    errors.push('ATC-006: Ed25519 signature verification failed');
  }
  return { errors, warnings };
}

function check_ATC_007_revocation(atc, options) {
  const errors = [];
  const warnings = [];
  const rev = atc.revocation || {};

  if (!isObject(atc.revocation)) {
    errors.push('ATC-007: revocation must be an object');
    return { errors, warnings };
  }
  if (!hasFields(rev, ['revocation_check_url', 'revocation_check_method', 'revocation_check_required'])) {
    errors.push('ATC-007: revocation must include revocation_check_url, revocation_check_method, revocation_check_required');
  }
  if (rev.revocation_check_method && !['ocsp', 'crl', 'simple_json'].includes(rev.revocation_check_method)) {
    errors.push(`ATC-007: revocation_check_method must be ocsp/crl/simple_json (got ${rev.revocation_check_method})`);
  }

  // SECURITY (v1.11.0): fail-closed revocation enforcement in TRUST mode.
  // This verifier is self-contained by design (no network calls), so the
  // caller supplies revocation evidence out-of-band via
  // options.revocation_status, which may be:
  //   - a pre-fetched revocation list: MarketNow live CRL format
  //     { cards: [{card_id, status, reason?, revoked_at?}] } or the ATC-007
  //     spec format { revoked_cards: [{card_id, reason?, revoked_at?}] }
  //   - a simple status object { revoked: true|false, reason?, revoked_at? }
  //     obtained from the issuer's revocation endpoint.
  // In SELF_DESCRIBED mode we keep the informational warning only (the
  // entire mode is explicitly NOT a trust decision).
  if (rev.revocation_check_required === true) {
    if (options && options.mode === 'self_described') {
      warnings.push('ATC-007: revocation_check_required=true and NO revocation evidence was evaluated (self-described mode). Signature validity does NOT mean the credential is currently trusted — the card may be revoked. Fetch the list at revocation_check_url before making a trust decision.');
    } else {
      const evidence = options ? options.revocation_status : undefined;
      if (evidence === undefined || evidence === null) {
        errors.push(`ATC-007: DENY (fail-closed) — revocation_check_required=true but no revocation evidence was supplied. Fetch the revocation list at ${rev.revocation_check_url || '(missing revocation_check_url)'} out-of-band and pass it via options.revocation_status (a pre-fetched CRL list or a simple {revoked:boolean} status). A cryptographically valid signature on a possibly-revoked card is not a trust decision.`);
      } else {
        const verdict = evaluateRevocationStatus(atc, evidence);
        if (isRevokedVerdict(verdict)) {
          errors.push(`ATC-007: card ${atc.card_id || '(no card_id)'} is REVOKED${verdict.reason ? ' — reason: ' + verdict.reason : ''}${verdict.revokedAt ? ' — revoked_at: ' + verdict.revokedAt : ''}. DENY.`);
        } else {
          warnings.push('ATC-007: revocation evidence supplied by caller — card is not revoked per the provided list/status. Keep revocation evidence fresh: re-fetch within your decision window.');
        }
      }
    }
  }
  return { errors, warnings };
}

// ─── Evaluate caller-supplied revocation evidence ──────────────────────────
// Mirrors atc-sdk/src/verify.mjs isCardRevoked() semantics exactly:
//   - `cards` array with per-card `status` (MarketNow live CRL format)
//   - `revoked_cards` array (ATC-007 spec format — presence = revoked)
//   - simple { revoked: boolean } status object
function evaluateRevocationStatus(atc, evidence) {
  if (!isObject(evidence)) {
    return { revoked: false, malformed: true };
  }
  // Simple status object
  if (typeof evidence.revoked === 'boolean' && !Array.isArray(evidence.cards) && !Array.isArray(evidence.revoked_cards)) {
    return {
      revoked: evidence.revoked,
      reason: evidence.reason || null,
      revokedAt: evidence.revoked_at || evidence.revokedAt || null,
    };
  }
  // List formats
  const cards = Array.isArray(evidence.cards) ? evidence.cards :
                Array.isArray(evidence.revoked_cards) ? evidence.revoked_cards : null;
  if (!cards) {
    return { revoked: false, malformed: true };
  }
  const cardId = atc.card_id;
  for (const c of cards) {
    if (isObject(c) && c.card_id === cardId) {
      const isRevoked = c.status === 'revoked' || !('status' in c);
      if (isRevoked) {
        return { revoked: true, reason: c.reason || null, revokedAt: c.revoked_at || null };
      }
      // Present in the list but status active — not revoked
      return { revoked: false };
    }
  }
  return { revoked: false };
}

// Small helper so the revoked check reads unambiguously at the call site.
function isRevokedVerdict(verdict) {
  return verdict && verdict.revoked === true;
}

function check_ATC_008_expiration(atc) {
  const errors = [];
  const warnings = [];
  const v = atc.validity || {};

  if (!isObject(atc.validity)) {
    errors.push('ATC-008: validity must be an object');
    return { errors, warnings };
  }
  if (!hasFields(v, ['issued_at', 'expires_at', 'max_ttl_days'])) {
    errors.push('ATC-008: validity must include issued_at, expires_at, max_ttl_days');
  }

  const now = Date.now();
  const issued = Date.parse(v.issued_at);
  const expires = Date.parse(v.expires_at);

  if (isNaN(issued)) {
    errors.push('ATC-008: validity.issued_at is not a valid ISO 8601 timestamp');
  }
  if (isNaN(expires)) {
    errors.push('ATC-008: validity.expires_at is not a valid ISO 8601 timestamp');
  }
  if (typeof v.max_ttl_days !== 'number' || v.max_ttl_days < 1 || v.max_ttl_days > 365) {
    errors.push('ATC-008: validity.max_ttl_days must be 1-365');
  }

  if (!isNaN(issued) && !isNaN(expires)) {
    const ttlDays = (expires - issued) / 86400000;
    if (ttlDays > v.max_ttl_days) {
      errors.push(`ATC-008: actual TTL (${ttlDays.toFixed(1)} days) exceeds max_ttl_days (${v.max_ttl_days})`);
    }
    // Allow ±5 minutes of clock skew
    if (now < issued - 5 * 60 * 1000) {
      errors.push('ATC-008: ATC issued in the future (clock skew > 5min)');
    }
    if (now > expires + 5 * 60 * 1000) {
      errors.push('ATC-008: ATC expired (clock skew > 5min)');
    }
    if (now > expires - 7 * 86400000 && now < expires) {
      warnings.push(`ATC-008: ATC expires in less than 7 days (${Math.ceil((expires - now) / 86400000)} days)`);
    }
  }
  return { errors, warnings };
}

// ─── Top-level verifier ─────────────────────────────────────────────────────

/**
 * Verifies an ATC/1.0 card.
 *
 * TRUST mode (default, fail-closed):
 *   verifyATC(atc, { trusted_ca }) — trusted_ca REQUIRED (base64 SPKI,
 *   obtained out-of-band). Missing trusted_ca → ATC-006 CONFIGURATION_ERROR,
 *   valid:false. When revocation_check_required=true, options.revocation_status
 *   (pre-fetched list or {revoked:boolean}) is also REQUIRED — no evidence →
 *   ATC-007 DENY (fail-closed). Never falls back to atc.issuer.ca_public_key.
 *
 * SELF_DESCRIBED mode (debugging/interop only — NOT a trust decision):
 *   verifyATC(atc, { mode: 'self_described' }) — verifies the signature math
 *   against the CA key embedded in the document. Result is labeled
 *   verification_mode:'SELF_DESCRIBED' / trust_decision:'NOT_APPLICABLE'.
 *   See also verifySelfDescribedSignature().
 *
 * @param {object} atc - The ATC JSON document to verify.
 * @param {object} [options]
 * @param {string} [options.trusted_ca] - Trusted CA public key (base64 SPKI),
 *                                        obtained OUT-OF-BAND. Required in TRUST mode.
 * @param {string} [options.ca_public_key] - Alias of trusted_ca (backward compat).
 * @param {string} [options.mode] - 'trust' (default) | 'self_described'.
 * @param {object} [options.revocation_status] - Revocation evidence (pre-fetched
 *        CRL list or simple {revoked:boolean} status). Required in TRUST mode
 *        when the card sets revocation_check_required=true.
 * @param {boolean} [options.fetch_revocation] - Accepted for backward compat;
 *        this verifier is self-contained (no network) — pass revocation_status
 *        instead. Emits a warning explaining this.
 * @returns {object} Verification result (see file header for shape).
 */
export function verifyATC(atc, options = {}) {
  const errors = [];
  const warnings = [];
  const controlsPassed = [];
  const controlsFailed = [];

  // Mode resolution: TRUST is the DEFAULT (fail-closed security path).
  // 'self_described' must be requested EXPLICITLY — it is never implicit.
  const selfDescribed = options.mode === 'self_described';
  const MODE = selfDescribed ? 'SELF_DESCRIBED' : 'TRUST';
  // The trusted CA anchor: caller-supplied ONLY. Never read from the document
  // on the trust path. (ca_public_key kept as a backward-compatible alias.)
  const trustedCA = !selfDescribed ? (options.trusted_ca || options.ca_public_key || null) : null;
  // The self-described key: ONLY meaningful in self-described mode.
  const selfDescribedCA = selfDescribed ? (atc?.issuer?.ca_public_key || null) : null;

  if (!isObject(atc)) {
    return {
      valid: false,
      verification_mode: MODE,
      trust_decision: 'DENY',
      spec_version: null,
      controls_passed: [],
      controls_failed: REQUIRED_CONTROLS,
      errors: ['ATC must be an object'],
      warnings: [],
      card_id: null,
      issuer_ca_id: null,
      trust_score: null,
      risk_level: null,
      expires_at: null,
    };
  }

  // Check spec_version
  if (atc.spec_version !== ATC_SPEC_VERSION) {
    errors.push(`Invalid spec_version: expected '${ATC_SPEC_VERSION}', got '${atc.spec_version}'`);
    return {
      valid: false,
      verification_mode: MODE,
      trust_decision: 'DENY',
      spec_version: atc.spec_version || null,
      controls_passed: [],
      controls_failed: REQUIRED_CONTROLS,
      errors,
      warnings,
      card_id: atc.card_id || null,
      issuer_ca_id: atc.issuer?.ca_id || null,
      trust_score: atc.risk?.trust_score ?? null,
      risk_level: atc.risk?.risk_level || null,
      expires_at: atc.validity?.expires_at || null,
    };
  }

  // Validate card_id format
  if (typeof atc.card_id !== 'string' || !CARD_ID_PATTERN.test(atc.card_id)) {
    errors.push(`card_id must match ${CARD_ID_PATTERN} (e.g. ATC-2026-7777670)`);
  }

  // Run per-control checks
  // ATC-007 receives the full options so it can enforce fail-closed
  // revocation in TRUST mode (mode + revocation_status).
  const checks = [
    ['ATC-001', check_ATC_001_identity(atc)],
    ['ATC-002', check_ATC_002_attestation(atc)],
    ['ATC-003', check_ATC_003_capabilities(atc)],
    ['ATC-004', check_ATC_004_evidence(atc)],
    ['ATC-005', check_ATC_005_risk(atc)],
    ['ATC-007', check_ATC_007_revocation(atc, options)],
    ['ATC-008', check_ATC_008_expiration(atc)],
  ];

  for (const [id, result] of checks) {
    if (result.errors.length === 0) {
      controlsPassed.push(id);
    } else {
      controlsFailed.push(id);
      errors.push(...result.errors);
    }
    warnings.push(...result.warnings);
  }

  // ATC-006 (signature) is checked last — only if ATC-002 passed (so we have a signature to verify)
  // The verification key is chosen by MODE, never by an implicit fallback:
  //   TRUST mode          → trustedCA (caller-supplied, out-of-band). May be null → CONFIGURATION_ERROR.
  //   SELF_DESCRIBED mode → selfDescribedCA (document-embedded). May be null → error.
  if (controlsPassed.includes('ATC-002')) {
    const verificationKey = selfDescribed ? selfDescribedCA : trustedCA;
    if (selfDescribed && !selfDescribedCA) {
      controlsFailed.push('ATC-006');
      errors.push('ATC-006: self-described mode selected but the document carries no issuer.ca_public_key to check the signature math against');
    } else {
      const sigResult = check_ATC_006_signature(atc, verificationKey);
      if (sigResult.errors.length === 0) {
        controlsPassed.push('ATC-006');
      } else {
        controlsFailed.push('ATC-006');
        errors.push(...sigResult.errors);
      }
      warnings.push(...sigResult.warnings);
    }
    if (selfDescribed) {
      warnings.push('SELF-DESCRIBED MODE: the signature was verified against the CA key embedded in the document itself. A malicious card can carry the very key that verifies its own signature — this result is NOT a trust decision. For a trust decision, obtain the CA key out-of-band and use TRUST mode (verifyATC(atc, { trusted_ca }) or verifyTrust()).');
    }
  } else {
    controlsFailed.push('ATC-006');
    errors.push('ATC-006: skipped because ATC-002 (attestation structure) failed');
  }

  // Optional controls — parse but don't fail
  if (atc.delegation) {
    warnings.push('ATC-009 (delegation) is present but not validated by this verifier');
  }
  if (atc.runtime_trust) {
    warnings.push('ATC-010 (runtime_trust) is present but not validated by this verifier');
  }
  if (options.fetch_revocation) {
    warnings.push('fetch_revocation=true is not supported — this verifier is self-contained (no network calls). Fetch the revocation list out-of-band and pass it via options.revocation_status instead.');
  }

  // Sort controls arrays for stable output
  controlsPassed.sort();
  controlsFailed.sort();

  return {
    valid: errors.length === 0,
    verification_mode: MODE,
    trust_decision: errors.length === 0 ? (selfDescribed ? 'NOT_APPLICABLE' : 'TRUST') : (selfDescribed ? 'NOT_APPLICABLE' : 'DENY'),
    spec_version: atc.spec_version,
    controls_passed: controlsPassed,
    controls_failed: controlsFailed,
    errors,
    warnings,
    card_id: atc.card_id || null,
    issuer_ca_id: atc.issuer?.ca_id || null,
    issuer_ca_url: atc.issuer?.ca_url || null,
    trust_score: atc.risk?.trust_score ?? null,
    risk_level: atc.risk?.risk_level || null,
    expires_at: atc.validity?.expires_at || null,
    agent_id: atc.identity?.agent_id || null,
    agent_name: atc.identity?.agent_name || null,
  };
}

// ─── Convenience exports for the two verification intents ──────────────────

/**
 * Strict TRUST verification — fail-closed by construction.
 *
 * This is the function to call before making ANY trust decision (execute,
 * grant, transact). It forces TRUST mode: a caller-supplied trusted CA is
 * mandatory, and revocation evidence is mandatory whenever the card sets
 * revocation_check_required=true. Any missing input → DENY with a
 * CONFIGURATION_ERROR-style message, never a silent pass.
 *
 * @param {object} atc - The ATC JSON document to verify.
 * @param {object} options - { trusted_ca (REQUIRED), revocation_status?, ca_public_key? (alias) }
 * @returns {object} Verification result (verification_mode:'TRUST').
 */
export function verifyTrust(atc, options = {}) {
  return verifyATC(atc, { ...options, mode: 'trust' });
}

/**
 * Self-described signature verification — debugging/interop ONLY.
 *
 * Verifies the signature math against the CA key embedded in the document
 * (atc.issuer.ca_public_key). Useful to confirm a card is self-consistent
 * (canonicalization, hash binding, Ed25519 math) when debugging an issuer.
 * The result is explicitly NOT a trust decision: a malicious card can carry
 * the very key that verifies its own signature.
 *
 * @param {object} atc - The ATC JSON document to check.
 * @returns {object} Verification result (verification_mode:'SELF_DESCRIBED',
 *                   trust_decision:'NOT_APPLICABLE').
 */
export function verifySelfDescribedSignature(atc) {
  return verifyATC(atc, { mode: 'self_described' });
}
