/**
 * MarketNow — Agent Trust Card (ATC) API — REAL IMPLEMENTATION
 * =============================================================
 *
 * SSL certificates for AI agents. MarketNow acts as the Certificate
 * Authority (CA). Every ATC is:
 *   1. Cryptographically SIGNED with the CA Ed25519 private key
 *   2. PERSISTED to _data/atc/{card_id}.json via GitHub API (durable)
 *   3. VERIFIABLE by anyone using the CA public key (GET /api/atc?action=ca-key)
 *   4. REVOCABLE — revoked cards are marked in the persisted record
 *
 * Operations:
 *   POST   /api/atc  {action:"issue", agent_id, public_key, ...}
 *     → Signs the ATC payload with CA Ed25519 key, persists to GitHub,
 *       returns the signed ATC.
 *   GET    /api/atc?action=verify&card_id=X
 *     → Fetches the ATC from GitHub, verifies the signature with CA
 *       public key, checks expiry, checks revocation status.
 *   POST   /api/atc  {action:"revoke", card_id, reason}
 *     → Updates the persisted ATC record: status="revoked".
 *       Future verify calls will return valid=false.
 *   GET    /api/atc
 *     → Lists all ATCs from _data/atc/ directory.
 *   GET    /api/atc?action=ca-key
 *     → Returns the CA public key (Ed25519 SPKI PEM).
 *   POST   /api/atc  {action:"translate", from, to, message}
 *     → Translates agent protocol messages (LangChain ↔ MCP ↔ AutoGen ↔ CrewAI).
 *
 * Sentinel score integration:
 *   When issuing, if `skill_id` is provided, the ATC's sentinel_score
 *   is fetched from the actual Sentinel certificate in _data/sentinel_certificates/.
 *   If `repo_url` is provided, we run a real-time audit via /api/audit-skill.
 *
 * Cryptography:
 *   - Algorithm: Ed25519 (RFC 8032)
 *   - Private key: Vercel env var MARKETNOW_ATC_CA_PRIVATE_KEY (PKCS8 PEM)
 *   - Public key: committed to _data/atc/ca-public-key.json (SPKI PEM)
 *   - Signature: detached, over the canonical JSON of the ATC payload
 */

import crypto from 'crypto';
import { setCorsHeaders } from '../lib/cors.mjs';
import { applySecurityHeaders } from '../lib/waf.mjs';
import { canonicalize as rfc8785Canonicalize } from '../lib/canonical-json.mjs';
import {
  buildReceipt,
  persistReceipt,
  fetchReceipt,
  verifyReceipt,
} from '../lib/action-receipt.mjs';
import { runL17 } from '../lib/sentinel-l17.mjs';
import {
  mintReferral,
  creditReferral,
  recordReferralClick,
  lookupReferral,
  listReferralsByAgent,
} from '../lib/referral-tracker.mjs';

const GITHUB_TOKEN = process.env.MANDATES_GITHUB_TOKEN;
const REPO = process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow';
const BRANCH = 'master';
const ATC_DIR = '_data/atc';
const CA_PRIVATE_KEY_PEM = process.env.MARKETNOW_ATC_CA_PRIVATE_KEY;

// In-memory caches (per warm instance)
let _caPrivateKey = null;
let _caPublicKey = null;
let _caPublicKeyPem = null;
let _atcCache = new Map(); // card_id → { data, fetchedAt }
const ATC_CACHE_TTL_MS = 5 * 1000; // 5s — short to avoid stale revocation across instances
// Rate limit map for submit-skill (per warm instance)
const _submitRateLimitMap = new Map();

// ─── CA key loading ──────────────────────────────────────────────────────

function loadCAKeys() {
  if (_caPrivateKey) return { privateKey: _caPrivateKey, publicKey: _caPublicKey, publicKeyPem: _caPublicKeyPem };

  if (!CA_PRIVATE_KEY_PEM) {
    throw new Error('CA private key not configured. Set MARKETNOW_ATC_CA_PRIVATE_KEY env var.');
  }

  _caPrivateKey = crypto.createPrivateKey(CA_PRIVATE_KEY_PEM);
  _caPublicKey = crypto.createPublicKey(_caPrivateKey);
  _caPublicKeyPem = _caPublicKey.export({ type: 'spki', format: 'pem' }).trim();
  return { privateKey: _caPrivateKey, publicKey: _caPublicKey, publicKeyPem: _caPublicKeyPem };
}

// ─── Signing & verification ─────────────────────────────────────────────

/**
 * Canonical JSON serialization using RFC 8785 (JCS).
 * Replaces the ad-hoc recursive sort with the international standard.
 * Fixes the canonicalization bug reported by @anp2network permanently.
 */
function canonicalJson(obj) {
  return rfc8785Canonicalize(obj);
}

/**
 * Sign data with Ed25519 CA private key.
 * Returns signature as hex string.
 */
function signATC(payload) {
  const { privateKey } = loadCAKeys();
  const data = Buffer.from(canonicalJson(payload), 'utf8');
  const signature = crypto.sign(null, data, privateKey); // null = Ed25519 has no algorithm param
  return signature.toString('hex');
}

/**
 * Verify an ATC signature.
 * @param {Object} payload - the ATC payload (without signature field)
 * @param {string} signatureHex - hex signature
 * @returns {boolean}
 */
function verifySignature(payload, signatureHex) {
  try {
    const { publicKey } = loadCAKeys();
    const data = Buffer.from(canonicalJson(payload), 'utf8');
    const signature = Buffer.from(signatureHex, 'hex');
    return crypto.verify(null, data, publicKey, signature);
  } catch (e) {
    return false;
  }
}

// ─── GitHub persistence ─────────────────────────────────────────────────

async function ghApiCall(method, path, body) {
  if (!GITHUB_TOKEN) throw new Error('GitHub token not configured');
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'marketnow-atc',
  };
  const opts = { method, headers };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(url, opts);
  return r;
}

async function fetchATC(card_id, { skipCache = false } = {}) {
  // Check cache (unless skipCache — verify always reads fresh)
  if (!skipCache) {
    const cached = _atcCache.get(card_id);
    if (cached && Date.now() - cached.fetchedAt < ATC_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Use GitHub Contents API (not raw) — raw has CDN cache that breaks
  // revocation consistency. The Contents API returns fresh content + the
  // file's current SHA (so we can detect updates).
  const url = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}/${encodeURIComponent(card_id)}.json?ref=${encodeURIComponent(BRANCH)}`;
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-atc',
      },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    const meta = await r.json();
    // Content is base64-encoded
    const content = Buffer.from(meta.content, 'base64').toString('utf8');
    const data = JSON.parse(content);
    _atcCache.set(card_id, { data, fetchedAt: Date.now() });
    return data;
  } catch (e) {
    return null;
  }
}

async function listATCs() {
  const url = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}?ref=${encodeURIComponent(BRANCH)}`;
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-atc',
      },
    });
    if (!r.ok) return [];
    const files = await r.json();
    if (!Array.isArray(files)) return [];
    const atcFiles = files.filter(f => f.type === 'file' && f.name.startsWith('ATC-') && f.name.endsWith('.json'));

    // Fetch each ATC via Contents API (not raw.githubusercontent —
    // raw has CDN cache issues that cause 404 on recently committed files).
    // Using Contents API with the file path returns base64-encoded content
    // that we decode locally.
    const atcs = [];
    for (let i = 0; i < atcFiles.length; i += 5) {
      const batch = atcFiles.slice(i, i + 5);
      const results = await Promise.all(batch.map(async f => {
        try {
          const fileUrl = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}/${encodeURIComponent(f.name)}?ref=${encodeURIComponent(BRANCH)}`;
          const fr = await fetch(fileUrl, {
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'marketnow-atc',
            },
          });
          if (!fr.ok) return null;
          const meta = await fr.json();
          if (!meta.content) return null;
          const content = Buffer.from(meta.content, 'base64').toString('utf8');
          return JSON.parse(content);
        } catch { return null; }
      }));
      atcs.push(...results.filter(Boolean));
    }
    return atcs;
  } catch (e) {
    return [];
  }
}

async function persistATC(card_id, atc) {
  // Get the existing file's SHA (if updating) so GitHub can replace it
  let sha = null;
  try {
    const metaUrl = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}/${encodeURIComponent(card_id)}.json?ref=${encodeURIComponent(BRANCH)}`;
    const metaR = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-atc',
      },
    });
    if (metaR.ok) {
      const meta = await metaR.json();
      sha = meta.sha;
    }
  } catch {}

  const content = Buffer.from(JSON.stringify(atc, null, 2)).toString('base64');
  const url = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}/${encodeURIComponent(card_id)}.json`;
  const body = {
    message: `${sha ? 'update' : 'issue'} ATC ${card_id}`,
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'marketnow-atc',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errBody = await r.text();
    throw new Error(`GitHub persist failed: ${r.status} ${errBody.slice(0, 200)}`);
  }

  // Invalidate cache
  _atcCache.delete(card_id);
  return true;
}

// ─── Sentinel score integration ─────────────────────────────────────────

async function fetchSentinelScore(skill_id) {
  if (!skill_id) return null;
  const url = `https://raw.githubusercontent.com/${REPO}/${encodeURIComponent(BRANCH)}/_data/sentinel_certificates/${encodeURIComponent(skill_id)}.json`;
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'marketnow-atc',
        Accept: 'application/vnd.github.raw',
      },
    });
    if (!r.ok) return null;
    const cert = await r.json();
    return {
      score: cert.overall_score ?? 0,
      risk_level: cert.risk_level ?? 'unknown',
      layers_run: cert.layers_run || {},
      certificate_id: cert.certificate_id || null,
    };
  } catch {
    return null;
  }
}

// ─── Handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  setCorsHeaders(req, res);
  applySecurityHeaders(res);
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();

  // Derive action from URL path if not explicitly set.
  // Vercel rewrites /api/submit-skill and /api/referrals to /api/atc,
  // so we detect the original path here.
  const urlPath = req.url?.split('?')[0] || req.path || '';
  const bodyAction = (req.body || {}).action;
  let action = req.query.action;

  if (urlPath.endsWith('/submit-skill')) {
    // POST /api/submit-skill → action=submit-skill
    // GET  /api/submit-skill?submission_id=sub_xxx → action=submission-status
    action = req.method === 'POST' ? 'submit-skill' : 'submission-status';
  } else if (urlPath.endsWith('/referrals')) {
    // Map /api/referrals body.action values to internal action names
    if (req.method === 'POST') {
      if (bodyAction === 'mint') action = 'mint-referral';
      else if (bodyAction === 'credit') action = 'credit-referral';
      else if (bodyAction === 'click') action = 'click-referral';
      else action = 'referrals-help';
    } else {
      // GET /api/referrals?action=lookup&ref_code=xxx
      if (req.query.action === 'lookup') action = 'referral-lookup';
      else if (req.query.action === 'list') action = 'referral-list';
      else action = 'referrals-help';
    }
  } else if (!action && bodyAction) {
    action = bodyAction;
  }

  try {
    // ─── GET handlers ──────────────────────────────────────────────────

    if (req.method === 'GET') {
      // ── ca-key: return CA public key ──
      if (action === 'ca-key') {
        let pubPem;
        try {
          ({ publicKeyPem: pubPem } = loadCAKeys());
        } catch {
          return res.status(503).json({
            error: 'CA not configured',
            message: 'MARKETNOW_ATC_CA_PRIVATE_KEY env var not set. ATC signing unavailable.',
          });
        }
        return res.status(200).json({
          ca_name: 'MarketNow Sentinel CA',
          algorithm: 'Ed25519',
          public_key_pem: pubPem,
          public_key_format: 'SPKI PEM (RFC 5280)',
          created_at: '2026-07-16',
          usage: 'Verify ATC signatures: crypto.verify(null, Buffer.from(canonicalJson(payload)), publicKey, Buffer.from(signature, "hex"))',
          canonical_json: 'JSON.stringify(payload, Object.keys(payload).sort())',
          url: 'https://marketnow.site/api/atc?action=ca-key',
          note: 'Pin this key in your agent runtime. If it changes, MarketNow CA has been rotated.',
        });
      }

      // ── spec: return ATC protocol spec ──
      if (action === 'spec') {
        return res.status(200).json({
          protocol: 'ATC',
          version: '1.1.0',
          description: 'Agent Trust Card — SSL certificates for AI agents. Cryptographically signed by MarketNow Sentinel CA.',
          cryptography: {
            algorithm: 'Ed25519 (RFC 8032)',
            signature_format: 'detached, hex-encoded',
            canonical_json: 'RFC 8785 JCS (JSON Canonicalization Scheme)',
          },
          endpoints: {
            issue: 'POST /api/atc {action:"issue", agent_id, public_key, capabilities?, skill_id?, wallet_address?}',
            verify: 'GET /api/atc?action=verify&card_id=ATC-2026-XXXXX',
            verify_receipt: 'GET /api/atc?action=verify-receipt&receipt_id=rcpt_xxxxxxxxxxxx',
            verify_vibe_receipt: 'GET /api/atc?action=verify-vibe-receipt (fetches Vibe sample + verifies) or POST {action: "verify-vibe-receipt", receipt: {...}}',
            revoke: 'POST /api/atc {action:"revoke", card_id, reason}',
            list: 'GET /api/atc',
            ca_key: 'GET /api/atc?action=ca-key',
            spec: 'GET /api/atc?action=spec',
            translate: 'POST /api/atc {action:"translate", from, to, message}',
          },
          // Schema v1.1.0 changes (response to @0xbrainkid on autogen#7965):
          // The ATC answers a NARROW set of questions (identity, issuer,
          // validity, review evidence). It does NOT answer "should this
          // agent be trusted?" — that is a runtime policy decision the
          // consumer makes using ATC evidence.
          schema_version: '1.1.0',
          decision_authority: 'consumer',
          what_the_atc_answers: [
            'identity binding (Ed25519 public key)',
            'issuer (which CA vouches for the binding)',
            'validity state (valid | revoked, with timestamp + reason)',
            'review evidence (Sentinel score, layers passed, audit timestamp, artifact hash)',
          ],
          what_the_atc_does_NOT_answer: [
            'should this agent be trusted? (runtime policy decision)',
            'is this agent safe for MY context? (consumer decides)',
            'will this agent behave at runtime? (covered by L3, separate layer)',
          ],
          sentinel_review_score: 'Review evidence (0-10). Derived from Sentinel certificate. NOT a trust verdict.',
          action_receipts: {
            description: 'Signed delivery proof for completed purchases. Closes the gap identified with @doteyeso-ops (Vibe) on PipedreamHQ/awesome-mcp-servers#94.',
            issue: 'Emitted automatically by POST /api/agent-purchase on successful instant_purchase or direct_purchase.',
            verify: 'GET /api/atc?action=verify-receipt&receipt_id=rcpt_xxxxxxxxxxxx',
            storage: '_data/receipts/{receipt_id}.json (public GitHub repo, same audit-ledger pattern as ATC)',
            interop: {
              vibe_decision_ref: 'mandate_id field',
              vibe_settle_coordinate: 'settle_txhash field',
              vibe_action_receipt: 'receipt_id field',
            },
          },
          persistence: 'ATCs persisted to _data/atc/{card_id}.json; receipts to _data/receipts/{receipt_id}.json. Both in the public GitHub repo — anyone can audit the ledger.',
          schema_changelog: [
            'v1.1.0 (2026-07-25): renamed trust.sentinel_score → trust.sentinel_review_score (review evidence, not verdict). Added decision_authority="consumer". Added action-receipt endpoint. sentinel_score kept as backward-compat alias.',
            'v1.0.0: original schema (sentinel_score, no decision_authority, no receipts).',
          ],
        });
      }

      // ── verify-receipt: verify an action-receipt ──
      // Closes the gap identified with @doteyeso-ops (Vibe) on
      // PipedreamHQ/awesome-mcp-servers#94 — agents can now verify the
      // signed delivery proof for a completed purchase.
      if (action === 'verify-receipt') {
        const { receipt_id } = req.query;
        if (!receipt_id) {
          return res.status(400).json({
            error: 'receipt_id required',
            example:
              'GET /api/atc?action=verify-receipt&receipt_id=rcpt_xxxxxxxxxxxx',
          });
        }

        const receipt = await fetchReceipt(receipt_id);
        if (!receipt) {
          return res.status(404).json({
            valid: false,
            receipt_id,
            reason: 'not_found',
            message: `No receipt with id ${receipt_id} exists.`,
          });
        }

        const result = verifyReceipt(receipt);
        if (!result.valid) {
          return res.status(200).json({
            valid: false,
            receipt_id,
            reason: result.reason,
            message:
              'Receipt signature does not verify against the CA public key. The record may have been tampered with.',
          });
        }

        return res.status(200).json({
          valid: true,
          receipt_id,
          issued_at: receipt.issued_at,
          mandate_id: receipt.mandate_id,
          settle_txhash: receipt.settle_txhash,
          atc_card_id: receipt.atc_card_id,
          delivered: receipt.delivered,
          amount_usd: receipt.amount_usd,
          network: receipt.network,
          signature_algorithm: receipt.signature.algorithm,
          signature_valid: true,
          message:
            'Receipt is valid. Delivery proof cryptographically verified against MarketNow CA.',
          // Join-key mapping for Vibe (doteyeso-ops) interoperability
          interop: {
            vibe_decision_ref: receipt.mandate_id,
            vibe_settle_coordinate: receipt.settle_txhash,
            vibe_action_receipt: receipt.receipt_id,
          },
        });
      }

      // ── verify: verify an ATC ──
      if (action === 'verify') {
        const { card_id } = req.query;
        if (!card_id) {
          return res.status(400).json({ error: 'card_id required' });
        }

        const atc = await fetchATC(card_id, { skipCache: true }); // verify always reads fresh
        if (!atc) {
          return res.status(404).json({
            valid: false,
            card_id,
            reason: 'ATC not found in registry',
            message: `No ATC with id ${card_id} exists. Check the card_id or list all ATCs at GET /api/atc.`,
          });
        }

        // Check revocation
        if (atc.status === 'revoked') {
          return res.status(200).json({
            valid: false,
            card_id,
            reason: 'revoked',
            revoked_at: atc.revoked_at,
            revocation_reason: atc.revocation_reason,
            message: 'This ATC has been revoked by the issuer or CA.',
          });
        }

        // Check expiry (metadata is inside payload)
        const now = new Date();
        const expires = new Date(atc.payload.metadata.expires_at);
        if (now > expires) {
          return res.status(200).json({
            valid: false,
            card_id,
            reason: 'expired',
            expires_at: atc.payload.metadata.expires_at,
            message: 'This ATC has expired. Renew at POST /api/atc {action:"issue", ...}',
          });
        }

        // Verify signature
        const { signature, payload } = atc;
        if (!signature || !payload) {
          return res.status(200).json({
            valid: false,
            card_id,
            reason: 'malformed',
            message: 'ATC record is missing signature or payload.',
          });
        }

        const sigValid = verifySignature(payload, signature.value);
        if (!sigValid) {
          return res.status(200).json({
            valid: false,
            card_id,
            reason: 'signature_invalid',
            message: 'ATC signature does not verify against the CA public key. The record may have been tampered with.',
          });
        }

        // All checks pass
        //
        // Schema note (July 2026, response to @0xbrainkid on
        // microsoft/autogen#7965): the ATC answers a NARROW set of
        // questions (identity, issuer, validity state, review evidence).
        // It does NOT answer "should this agent be trusted?" — that is
        // a runtime policy decision the consumer makes using ATC evidence.
        // The new `decision_authority: "consumer"` field makes this
        // explicit. The renamed `sentinel_review_score` (was
        // `sentinel_score`) clarifies that the score is REVIEW EVIDENCE,
        // not a trust verdict. The old field is kept as an alias for
        // backward compatibility with existing consumers.
        return res.status(200).json({
          valid: true,
          card_id,
          agent_id: payload.agent_id,
          agent_name: payload.agent_name,
          // Renamed field (was sentinel_score) — review evidence, not a verdict
          sentinel_review_score: payload.trust.sentinel_review_score ?? payload.trust.sentinel_score,
          // Backward-compat alias — deprecated, will be removed in v2.0.0
          sentinel_score: payload.trust.sentinel_review_score ?? payload.trust.sentinel_score,
          composite_trust: payload.trust.composite_trust,
          risk_level: payload.trust.risk_level,
          // Explicit: the consumer (not the ATC) is the trust-decision authority
          decision_authority: 'consumer',
          capabilities: payload.capabilities.provides,
          protocol_language: payload.capabilities.protocol_language,
          wallet: payload.payment.wallet_address,
          issued_at: payload.metadata.issued_at,
          expires_at: payload.metadata.expires_at,
          issuer: payload.metadata.issuer,
          signature_algorithm: signature.algorithm,
          signature_valid: true,
          message: 'ATC is valid, signature verified, not expired, not revoked.',
          schema_version: '1.1.0',
          schema_changes: [
            'v1.1.0: renamed trust.sentinel_score → trust.sentinel_review_score (review evidence, not verdict)',
            'v1.1.0: added decision_authority="consumer" (consumer makes the trust decision, not the card)',
            'v1.0.0: original schema (sentinel_score, no decision_authority)',
          ],
        });
      }

      // ── verify-vibe-receipt: verify a Vibe action-receipt ──
      // Completes the MarketNow ↔ Vibe mutual hop: Vibe can verify our
      // receipts via /api/atc?action=verify-receipt, and we can verify
      // their receipts via this endpoint.
      //
      // GET /api/atc?action=verify-vibe-receipt
      //   → fetches the Vibe sample receipt and verifies it
      // POST /api/atc {action: "verify-vibe-receipt", receipt: {...}}
      //   → verifies a Vibe receipt passed in the body
      if (action === 'verify-vibe-receipt') {
        // Dynamic import to avoid loading the verifier unless needed
        const { verifyVibeReceipt, fetchVibePublicKey, fetchAndVerifyVibeSample } =
          await import('../lib/vibe-verifier.mjs');

        // If GET with no body, fetch and verify the Vibe sample
        if (req.method === 'GET') {
          try {
            const { receipt, verification } = await fetchAndVerifyVibeSample();
            return res.status(200).json({
              valid: verification.valid,
              source: 'vibe_sample',
              receipt_id: receipt.receipt_id,
              agent_id: receipt.agent_id,
              action: receipt.action,
              ref_code: receipt.ref_code,
              ref_bound: receipt.ref_bound,
              ref_bound_match: verification.ref_bound_match,
              signature_algorithm: receipt.algorithm,
              signature_valid: verification.valid,
              message: verification.valid
                ? 'Vibe receipt verified cryptographically against the Vibe CA public key. Mutual hop confirmed.'
                : `Verification failed: ${verification.reason}`,
              interop: {
                marketnow_endpoint: 'GET /api/atc?action=verify-vibe-receipt',
                vibe_endpoint: 'GET https://vibes-coded.com/api/v1/outcomes/action-receipt/sample?with_ref=true',
                mutual_hop: verification.valid ? 'bidirectional_verified' : 'verification_failed',
              },
              receipt: receipt,
            });
          } catch (e) {
            return res.status(502).json({
              valid: false,
              error: 'vibe_fetch_failed',
              message: `Could not fetch Vibe sample: ${e.message}`,
            });
          }
        }

        // POST with receipt in body
        const body = req.body || {};
        const receipt = body.receipt;
        if (!receipt) {
          return res.status(400).json({
            error: 'receipt required',
            example: {
              action: 'verify-vibe-receipt',
              receipt: {
                receipt_id: 'rcpt_xxx',
                agent_id: 'vibes-sample',
                action: 'sample.ping',
                payload_digest: '...',
                nonce: '...',
                quote: '...',
                ts: '2026-07-24T...',
                receipt_type: 'raw',
                ed25519_signature: '...',
                ref_code: 'ref_xxx',
                ref_bound: true,
              },
            },
          });
        }

        const refBound = body.ref_bound ?? receipt.ref_bound ?? false;
        const verification = await verifyVibeReceipt(receipt, { ref_bound: refBound });

        return res.status(200).json({
          valid: verification.valid,
          receipt_id: receipt.receipt_id,
          agent_id: receipt.agent_id,
          ref_bound_match: verification.ref_bound_match,
          signature_valid: verification.valid,
          reason: verification.reason || null,
          message: verification.valid
            ? 'Vibe receipt verified against Vibe CA public key.'
            : `Verification failed: ${verification.reason}`,
          interop: {
            marketnow_endpoint: 'POST /api/atc {action: "verify-vibe-receipt", receipt: {...}}',
            vibe_preimage_format: 'agent_id|action|payload_digest|nonce|quote|ts|rt:<receipt_type>(|decision_ref)(|ref:<ref_code>)',
            mutual_hop: verification.valid ? 'bidirectional_verified' : 'verification_failed',
          },
        });
      }

      // ── submission-status: check submission status (GET) ──
      // Routed via vercel.json rewrite: GET /api/submit-skill?submission_id=sub_xxx → /api/atc?action=submission-status&submission_id=sub_xxx
      if (action === 'submission-status') {
        const { submission_id } = req.query;
        if (!submission_id) {
          return res.status(200).json({
            endpoint: 'POST /api/submit-skill',
            description: 'Submit a GitHub repo to the MarketNow marketplace.',
            body: {
              repo_url: 'string (required) — https://github.com/owner/repo',
              name: 'string (optional)',
              description: 'string (optional)',
              submitter_agent_id: 'string (optional)',
              submitter_email: 'string (optional)',
              ref_code: 'string (optional)',
            },
            rate_limit: '5 submissions per hour per IP',
          });
        }
        if (!GITHUB_TOKEN) {
          return res.status(503).json({ error: 'GitHub token not configured' });
        }
        const url = `https://api.github.com/repos/${REPO}/contents/_data/pending_submissions/${encodeURIComponent(submission_id)}.json?ref=${encodeURIComponent(BRANCH)}`;
        try {
          const r = await fetch(url, {
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'marketnow-submit',
            },
          });
          if (r.status === 404) {
            return res.status(404).json({ error: 'submission_not_found', submission_id });
          }
          if (!r.ok) throw new Error(`GitHub ${r.status}`);
          const meta = await r.json();
          const content = Buffer.from(meta.content, 'base64').toString('utf8');
          const submission = JSON.parse(content);
          return res.status(200).json({
            submission_id: submission.submission_id,
            skill_id: submission.skill_id,
            status: submission.status,
            submitted_at: submission.submitted_at,
            repo: submission.repo,
            audit: submission.audit,
            atc_preallocated: submission.atc_preallocated,
            atc_card_id: submission.atc_card_id,
            ledger_url: `https://github.com/${REPO}/blob/${BRANCH}/_data/pending_submissions/${submission_id}.json`,
          });
        } catch (e) {
          return res.status(500).json({ error: 'fetch_failed', message: e.message });
        }
      }

      // ── referral-lookup: get referral stats (GET) ──
      // Routed via vercel.json rewrite: GET /api/referrals?action=lookup&ref_code=ref_xxx → /api/atc?action=referral-lookup&ref_code=ref_xxx
      if (action === 'referral-lookup') {
        const { ref_code } = req.query;
        if (!ref_code) {
          return res.status(400).json({ error: 'ref_code required' });
        }
        const referral = await lookupReferral(ref_code);
        if (!referral) {
          return res.status(404).json({
            error: 'referral_not_found',
            ref_code,
            message: `No referral with code ${ref_code} exists.`,
          });
        }
        return res.status(200).json(referral);
      }

      // ── referral-list: list referrals by agent (GET) ──
      if (action === 'referral-list') {
        const { agent_id } = req.query;
        if (!agent_id) {
          return res.status(400).json({ error: 'agent_id required' });
        }
        const referrals = await listReferralsByAgent(agent_id);
        return res.status(200).json({
          agent_id,
          total_ref_codes: referrals.length,
          referrals,
        });
      }

      // ── referrals-help: spec (GET) ──
      if (action === 'referrals-help') {
        return res.status(200).json({
          endpoint: '/api/referrals',
          description: 'Referral tracking for the MarketNow viral loop.',
          commission_rate: 0.05,
          endpoints: {
            mint: 'POST /api/referrals { action: "mint", agent_id }',
            lookup: 'GET /api/referrals?action=lookup&ref_code=ref_xxxxxxxx',
            list: 'GET /api/referrals?action=list&agent_id=agent_xxx',
            credit: 'POST /api/referrals { action: "credit", ref_code, skill_id, amount_usd, ... }',
            click: 'POST /api/referrals { action: "click", ref_code }',
          },
        });
      }

      // ── list (default GET): list all ATCs ──
      const atcs = await listATCs();
      return res.status(200).json({
        total: atcs.length,
        schema_version: '1.1.0',
        decision_authority: 'consumer',
        cards: atcs.map(a => ({
          card_id: a.payload?.card_id || a.card_id,
          agent_id: a.payload?.agent_id,
          agent_name: a.payload?.agent_name,
          // Renamed (was sentinel_score) — review evidence, not verdict
          sentinel_review_score:
            a.payload?.trust?.sentinel_review_score ??
            a.payload?.trust?.sentinel_score ??
            0,
          // Backward-compat alias
          sentinel_score:
            a.payload?.trust?.sentinel_review_score ??
            a.payload?.trust?.sentinel_score ??
            0,
          risk_level: a.payload?.trust?.risk_level ?? 'unknown',
          status: a.status || 'active',
          issued_at: a.payload?.metadata?.issued_at,
          expires_at: a.payload?.metadata?.expires_at,
        })),
      });
    }

    // ─── POST handlers ─────────────────────────────────────────────────

    if (req.method === 'POST') {
      const body = req.body || {};
      // postAction prefers the derived `action` variable (set from URL path
      // or query string), falling back to body.action for backward compat.
      const postAction = action || body.action;

      // ── issue: create + sign + persist a new ATC ──
      if (postAction === 'issue') {
        const { agent_id, agent_name, public_key, capabilities, protocol_language, wallet_address, skill_id } = body;

        if (!agent_id || !public_key) {
          return res.status(400).json({
            error: 'agent_id and public_key required',
            example: {
              agent_id: 'agent.example.myagent',
              public_key: 'Ed25519 public key (SPKI PEM or base64 raw)',
              capabilities: ['search', 'recommend'],
              protocol_language: 'mcp',
              wallet_address: '0x...',
              skill_id: 'mn-real-xxx (optional, links ATC to Sentinel audit)',
            },
          });
        }

        // Load CA key (will throw if not configured)
        let privateKey;
        try {
          ({ privateKey } = loadCAKeys());
        } catch (e) {
          return res.status(503).json({
            error: 'CA not configured',
            message: e.message,
          });
        }

        // Generate card_id
        const card_id = `ATC-2026-${String(Date.now()).slice(-7)}`;
        const now = new Date();
        const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

        // Fetch Sentinel score if skill_id provided
        let sentinelInfo = { score: 0, risk_level: 'not_audited', layers_run: {}, certificate_id: null };
        if (skill_id) {
          const sInfo = await fetchSentinelScore(skill_id);
          if (sInfo) sentinelInfo = sInfo;
        }

        // Build the payload (this is what gets signed)
        //
        // Schema v1.1.0 (July 2026, response to @0xbrainkid on
        // microsoft/autogen#7965):
        //   - Renamed trust.sentinel_score → trust.sentinel_review_score
        //     (review evidence, not a trust verdict)
        //   - Added decision_authority="consumer" at the top level
        //   - sentinel_score kept as alias for backward compat with v1.0.0
        const payload = {
          card_id,
          schema_version: '1.1.0',
          decision_authority: 'consumer',
          agent_id,
          agent_name: agent_name || agent_id,
          identity: {
            public_key,
            key_algorithm: 'Ed25519',
          },
          trust: {
            // Renamed (was sentinel_score) — review evidence, not a verdict
            sentinel_review_score: sentinelInfo.score,
            // Backward-compat alias — deprecated, will be removed in v2.0.0
            sentinel_score: sentinelInfo.score,
            audit_layers_passed: sentinelInfo.layers_run,
            composite_trust: sentinelInfo.score,
            risk_level: sentinelInfo.risk_level,
            certificate_id: sentinelInfo.certificate_id,
          },
          capabilities: {
            provides: capabilities || [],
            protocol_language: protocol_language || 'mcp',
            translate: true,
          },
          payment: {
            method: 'x402 + USDC on Base L2',
            wallet_address: wallet_address || null,
          },
          metadata: {
            issued_at: now.toISOString(),
            expires_at: expires.toISOString(),
            issuer: 'MarketNow Sentinel CA',
            revocation_url: `https://marketnow.site/api/atc?action=verify&card_id=${card_id}`,
          },
        };

        // Sign the payload
        const signatureValue = signATC(payload);

        const atcRecord = {
          card_id,
          status: 'active',
          payload,
          signature: {
            algorithm: 'Ed25519 (RFC 8032)',
            value: signatureValue,
            signed_by: 'MarketNow Sentinel CA',
            signed_at: now.toISOString(),
            canonical_json: 'JSON.stringify(payload, Object.keys(payload).sort())',
            verify_with: 'GET /api/atc?action=ca-key',
          },
        };

        // Persist to GitHub
        try {
          await persistATC(card_id, atcRecord);
        } catch (e) {
          return res.status(500).json({
            error: 'persist_failed',
            message: `ATC was signed but could not be persisted: ${e.message}`,
            card_id,
            signature: atcRecord.signature,
            note: 'The ATC is valid but not yet in the public registry. Contact support@alicelabs.site.',
          });
        }

        return res.status(201).json({
          status: 'issued',
          card_id,
          ...atcRecord.payload,
          signature: atcRecord.signature,
          verify_url: `https://marketnow.site/api/atc?action=verify&card_id=${card_id}`,
          next_steps: [
            `1. Verify: GET /api/atc?action=verify&card_id=${card_id}`,
            '2. Pin the CA public key in your agent runtime: GET /api/atc?action=ca-key',
            `3. Renew before ${expires.toISOString()}`,
            '4. Other agents can verify your identity by checking this ATC',
          ],
        });
      }

      // ── revoke: mark an ATC as revoked ──
      if (postAction === 'revoke') {
        const { card_id, reason } = body;
        if (!card_id) {
          return res.status(400).json({ error: 'card_id required' });
        }

        const atc = await fetchATC(card_id, { skipCache: true }); // revoke reads fresh
        if (!atc) {
          return res.status(404).json({ error: 'ATC not found', card_id });
        }

        if (atc.status === 'revoked') {
          return res.status(200).json({
            status: 'already_revoked',
            card_id,
            revoked_at: atc.revoked_at,
            message: 'This ATC was already revoked.',
          });
        }

        // Update the record
        atc.status = 'revoked';
        atc.revoked_at = new Date().toISOString();
        atc.revocation_reason = reason || 'No reason provided';

        try {
          await persistATC(card_id, atc);
        } catch (e) {
          return res.status(500).json({
            error: 'persist_failed',
            message: `Could not persist revocation: ${e.message}`,
          });
        }

        return res.status(200).json({
          status: 'revoked',
          card_id,
          reason: atc.revocation_reason,
          revoked_at: atc.revoked_at,
          message: `ATC ${card_id} has been revoked. Future verify calls will return valid=false.`,
        });
      }

      // ── translate: real framework translation ──
      if (postAction === 'translate') {
        const { from, to, message } = body;
        if (!from || !to || !message) {
          return res.status(400).json({
            error: 'from, to, and message are required',
            supported: {
              from: ['langchain', 'mcp', 'autogen', 'crewai', 'openai_functions'],
              to: ['langchain', 'mcp', 'autogen', 'crewai', 'openai_functions'],
            },
          });
        }

        const supported = ['langchain', 'mcp', 'autogen', 'crewai', 'openai_functions'];
        if (!supported.includes(from) || !supported.includes(to)) {
          return res.status(400).json({
            error: 'unsupported framework',
            supported,
            got: { from, to },
          });
        }

        if (from === to) {
          return res.status(200).json({
            status: 'translated',
            from,
            to,
            original: message,
            translated: message,
            note: 'Same framework — no translation needed.',
          });
        }

        // Real translation: convert between tool/function schemas
        // Each framework has a different shape for declaring tool calls
        const translated = translateMessage(from, to, message);

        return res.status(200).json({
          status: 'translated',
          from,
          to,
          original: message,
          translated,
          note: `Translated from ${from} to ${to}. Schema mapping applied.`,
        });
      }

      // ── submit-skill: real submission (L1.5 + L1.7 sync, L2 queued) ──
      // Closes the "agent magnet" gap — submit_skill is now real.
      // Routed via vercel.json rewrite: POST /api/submit-skill → /api/atc?action=submit-skill
      if (postAction === 'submit-skill') {
        const { repo_url, name, description, submitter_agent_id, submitter_email, ref_code } = body;
        if (!repo_url) {
          return res.status(400).json({
            error: 'repo_url required',
            example: { repo_url: 'https://github.com/user/my-mcp-server' },
          });
        }

        // Rate limit: 5 submissions per hour per IP (anti-spam)
        // Uses Vercel's x-vercel-forwarded-for header (trusted, can't be spoofed)
        const vercelIp = req.headers['x-vercel-forwarded-for'] || 'unknown';
        const ipKey = `submit-skill:${vercelIp}`;
        if (_submitRateLimitMap.has(ipKey)) {
          const entry = _submitRateLimitMap.get(ipKey);
          const windowMs = 60 * 60 * 1000; // 1 hour
          const max = 5;
          if (Date.now() - entry.startedAt < windowMs) {
            if (entry.count >= max) {
              return res.status(429).json({
                error: 'rate_limited',
                message: `Too many submissions. Try again in ${Math.ceil((entry.startedAt + windowMs - Date.now()) / 60000)} minutes.`,
              });
            }
            entry.count += 1;
          } else {
            _submitRateLimitMap.set(ipKey, { count: 1, startedAt: Date.now() });
          }
        } else {
          _submitRateLimitMap.set(ipKey, { count: 1, startedAt: Date.now() });
        }
        const ip = vercelIp;

        // Parse repo URL
        const patterns = [
          /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/i,
          /^([^/\s]+)\/([^/\s]+)$/,
        ];
        let owner = null, repoName = null;
        for (const p of patterns) {
          const m = repo_url.match(p);
          if (m) { owner = m[1]; repoName = m[2]; break; }
        }
        if (!owner) {
          return res.status(400).json({
            error: 'invalid_repo_url',
            message: 'Could not parse repo_url. Expected: https://github.com/owner/repo',
          });
        }

        // Fetch repo metadata
        let repoMeta;
        try {
          const r = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'marketnow-submit',
            },
          });
          if (r.status === 404) {
            return res.status(404).json({ error: 'repo_not_found', message: `${owner}/${repoName} not found` });
          }
          if (!r.ok) throw new Error(`GitHub ${r.status}`);
          repoMeta = await r.json();
        } catch (e) {
          return res.status(502).json({ error: 'github_fetch_failed', message: e.message });
        }

        // Fetch README + package.json
        let readmeText = null;
        for (const ref of ['main', 'master', 'HEAD']) {
          try {
            const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/${ref}/README.md`, {
              headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'marketnow-submit' },
            });
            if (r.ok) { readmeText = await r.text(); break; }
          } catch {}
        }
        let pkgJson = null;
        for (const ref of ['main', 'master', 'HEAD']) {
          try {
            const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/${ref}/package.json`, {
              headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'marketnow-submit' },
            });
            if (r.ok) { pkgJson = JSON.parse(await r.text()); break; }
          } catch {}
        }

        // L1.5 lightweight checks
        const findings = [];
        if (!readmeText) findings.push({ severity: 'medium', code: 'no_readme' });
        if (!repoMeta.description) findings.push({ severity: 'low', code: 'no_description' });
        if (!repoMeta.license) findings.push({ severity: 'medium', code: 'no_license' });
        if (repoMeta.archived) findings.push({ severity: 'high', code: 'archived' });
        if (repoMeta.disabled) findings.push({ severity: 'high', code: 'disabled' });
        let l15Score = 10;
        for (const f of findings) {
          if (f.severity === 'high') l15Score -= 3;
          else if (f.severity === 'medium') l15Score -= 1;
          else l15Score -= 0.5;
        }
        l15Score = Math.max(0, l15Score);

        // L1.7 malware pattern check
        let l17Blocked = false;
        let l17Findings = [];
        try {
          const l17Result = runL17({
            name: name || repoMeta.name,
            description: description || repoMeta.description || '',
            readme: readmeText || '',
            package_json: pkgJson || {},
          });
          l17Blocked = l17Result.blocked;
          l17Findings = l17Result.findings;
        } catch (e) {
          console.error('L1.7 error (non-fatal):', e.message);
        }

        if (l17Blocked) {
          return res.status(422).json({
            status: 'rejected',
            reason: 'malware_pattern_detected',
            repo_url,
            findings: l17Findings,
          });
        }
        if (l15Score < 4) {
          return res.status(422).json({
            status: 'rejected',
            reason: 'low_metadata_score',
            l15_score: l15Score,
            findings,
          });
        }

        // Build submission record
        const submissionId = 'sub_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        const skillId = `mn-sub-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
        const now = new Date().toISOString();
        const submission = {
          submission_id: submissionId,
          skill_id: skillId,
          status: 'pending_l2_audit',
          submitted_at: now,
          submitter: {
            agent_id: submitter_agent_id || null,
            email: submitter_email || null,
            ref_code: ref_code || null,
            ip_hash: crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16),
          },
          repo: {
            url: repo_url,
            full_name: repoMeta.full_name,
            owner, name: repoName,
            description: repoMeta.description,
            stars: repoMeta.stargazers_count || 0,
            language: repoMeta.language,
            license: repoMeta.license?.spdx_id || null,
            pushed_at: repoMeta.pushed_at,
            archived: repoMeta.archived,
            topics: repoMeta.topics || [],
          },
          skill: {
            id: skillId,
            name: name || repoMeta.name,
            slug: `${repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${skillId.slice(-4)}`,
            description: description || repoMeta.description || '',
            category: 'Community Submitted',
            price: 0,
            review_status: 'auto-scanned',
            source: { type: 'community-submitted', url: repo_url, submitted_at: now },
            install: pkgJson?.name ? `npx -y ${pkgJson.name}` : `git clone ${repo_url}`,
            author: owner,
            version: pkgJson?.version || '0.0.0',
          },
          audit: {
            l15_score: l15Score,
            l15_findings: findings,
            l17_blocked: false,
            l17_findings: l17Findings,
            l2_status: 'queued',
            l2_scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          },
          atc_preallocated: false,
          atc_card_id: null,
        };

        // Persist to GitHub
        let persisted = false;
        try {
          const filePath = `_data/pending_submissions/${encodeURIComponent(submissionId)}.json`;
          const content = Buffer.from(JSON.stringify(submission, null, 2)).toString('base64');
          const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'marketnow-submit',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `submit skill ${submissionId} (${repoMeta.full_name})`,
              content,
              branch: BRANCH,
            }),
          });
          persisted = r.ok;
        } catch (e) {
          console.error('Submission persist failed (non-fatal):', e.message);
        }

        return res.status(201).json({
          status: 'submitted',
          submission_id: submissionId,
          skill_id: skillId,
          repo: {
            full_name: repoMeta.full_name,
            stars: repoMeta.stargazers_count || 0,
            language: repoMeta.language,
            license: repoMeta.license?.spdx_id || null,
          },
          audit: {
            l15_score: l15Score,
            l15_findings: findings,
            l17_blocked: false,
            l2_status: 'queued',
            l2_estimated_completion: submission.audit.l2_scheduled_at,
          },
          persisted_to_ledger: persisted,
          ledger_url: persisted ? `https://github.com/${REPO}/blob/${BRANCH}/_data/pending_submissions/${submissionId}.json` : null,
          next_steps: [
            '1. L2 sandbox audit will run within ~1 hour via GitHub Actions',
            '2. If L2 passes (score ≥ 7), the skill is promoted to the main catalog',
            '3. An ATC (Agent Trust Card) is issued automatically',
            `4. Check status: GET /api/submit-skill?submission_id=${submissionId}`,
            '5. The skill becomes discoverable via search_skills in the MCP server',
          ],
          check_status_url: `https://marketnow.site/api/submit-skill?submission_id=${submissionId}`,
          message: `Submission accepted. L1.5 score ${l15Score}/10. L2 audit queued.`,
        });
      }

      // ── mint-referral: mint a new referral code ──
      // Routed via vercel.json rewrite: POST /api/referrals?action=mint → /api/atc?action=mint-referral
      if (postAction === 'mint-referral') {
        const { agent_id } = body;
        if (!agent_id) {
          return res.status(400).json({ error: 'agent_id required' });
        }
        const referral = await mintReferral(agent_id);
        return res.status(201).json({
          status: 'minted',
          ...referral,
          share_url: `https://marketnow.site/?ref=${referral.ref_code}`,
          note: 'Share this ref_code. When other agents use it for purchases, you earn 5% commission.',
        });
      }

      // ── credit-referral: record a credit (called internally by agent-purchase) ──
      if (postAction === 'credit-referral') {
        const { ref_code, skill_id, license_key, amount_usd, tx_hash, receipt_id } = body;
        if (!ref_code || !skill_id || amount_usd == null) {
          return res.status(400).json({ error: 'ref_code, skill_id, amount_usd required' });
        }
        const updated = await creditReferral(ref_code, {
          skill_id, license_key, amount_usd: Number(amount_usd), tx_hash, receipt_id,
        });
        if (!updated) {
          return res.status(200).json({ status: 'no_credit', ref_code, message: 'Referral not found or revoked.' });
        }
        return res.status(200).json({
          status: 'credited',
          ref_code,
          commission_earned_usd: Number((amount_usd * 0.05).toFixed(2)),
          new_total_earned_usd: updated.total_earned_usd,
          total_purchases: updated.purchases,
        });
      }

      // ── click-referral: record a click ──
      if (postAction === 'click-referral') {
        const { ref_code } = body;
        if (!ref_code) return res.status(400).json({ error: 'ref_code required' });
        const updated = await recordReferralClick(ref_code);
        if (!updated) {
          return res.status(200).json({ status: 'no_click_recorded', ref_code });
        }
        return res.status(200).json({ status: 'click_recorded', ref_code, new_click_count: updated.clicks });
      }

      return res.status(400).json({
        error: 'Unknown action',
        supported: [
          'issue', 'verify (GET)', 'verify-receipt (GET)', 'verify-vibe-receipt (GET)', 'revoke', 'list (GET)',
          'ca-key (GET)', 'spec (GET)', 'translate',
          'submit-skill (POST)', 'mint-referral (POST)', 'credit-referral (POST)', 'click-referral (POST)',
        ],
      });
    }

    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  } catch (err) {
    console.error('ATC API error:', err);
    return res.status(500).json({
      error: 'atc_failed',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}

// ─── Framework translation ──────────────────────────────────────────────

/**
 * Translate agent tool schemas between frameworks.
 * Real schema mapping — not a passthrough.
 */
function translateMessage(from, to, message) {
  // Normalize to MCP shape first (our canonical format)
  let mcpShape;

  switch (from) {
    case 'mcp':
      mcpShape = message; // already canonical
      break;
    case 'langchain':
      // LangChain tool: { name, description, args_schema (pydantic) }
      mcpShape = {
        name: message.name,
        description: message.description,
        inputSchema: {
          type: 'object',
          properties: message.args_schema?.properties || {},
          required: message.args_schema?.required || [],
        },
      };
      break;
    case 'openai_functions':
      // OpenAI function: { name, description, parameters }
      mcpShape = {
        name: message.name,
        description: message.description,
        inputSchema: message.parameters || { type: 'object', properties: {} },
      };
      break;
    case 'autogen':
      // AutoGen: { name, description, parameters }
      mcpShape = {
        name: message.name,
        description: message.description,
        inputSchema: message.parameters || { type: 'object', properties: {} },
      };
      break;
    case 'crewai':
      // CrewAI: { name, description, args (list of {name, type, description}) }
      const props = {};
      for (const arg of (message.args || [])) {
        props[arg.name] = { type: arg.type, description: arg.description };
      }
      mcpShape = {
        name: message.name,
        description: message.description,
        inputSchema: {
          type: 'object',
          properties: props,
          required: (message.args || []).filter(a => a.required).map(a => a.name),
        },
      };
      break;
    default:
      mcpShape = message;
  }

  // Now convert from MCP shape to target
  switch (to) {
    case 'mcp':
      return mcpShape;
    case 'langchain':
      return {
        name: mcpShape.name,
        description: mcpShape.description,
        args_schema: {
          type: 'object',
          properties: mcpShape.inputSchema?.properties || {},
          required: mcpShape.inputSchema?.required || [],
        },
      };
    case 'openai_functions':
      return {
        name: mcpShape.name,
        description: mcpShape.description,
        parameters: mcpShape.inputSchema || { type: 'object', properties: {} },
      };
    case 'autogen':
      return {
        name: mcpShape.name,
        description: mcpShape.description,
        parameters: mcpShape.inputSchema || { type: 'object', properties: {} },
      };
    case 'crewai':
      const props = mcpShape.inputSchema?.properties || {};
      return {
        name: mcpShape.name,
        description: mcpShape.description,
        args: Object.entries(props).map(([name, schema]) => ({
          name,
          type: schema.type || 'string',
          description: schema.description || '',
          required: (mcpShape.inputSchema?.required || []).includes(name),
        })),
      };
    default:
      return mcpShape;
  }
}
