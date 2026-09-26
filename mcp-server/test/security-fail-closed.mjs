/**
 * Functional test for the v1.11.0 fail-closed security model in
 * mcp-server/lib/atc-verify.mjs.
 *
 * Cases:
 *  1. TRUST mode default, no trusted CA            → DENY (CONFIGURATION_ERROR)
 *  2. TRUST mode, trusted CA, no revocation        → DENY (ATC-007 fail-closed)
 *  3. TRUST mode, trusted CA + not-revoked status  → valid:true, TRUST
 *  4. TRUST mode, trusted CA + revoked status      → DENY (REVOKED)
 *  5. TRUST mode, wrong trusted CA                 → DENY (signature fails)
 *  6. SELF_DESCRIBED mode                          → math valid, NOT_APPLICABLE
 *  7. verifyTrust() wrapper                        → same as 2 (fail-closed)
 *  8. verifySelfDescribedSignature()               → same as 6
 *  9. Tampered payload in self-described mode      → signature fails
 * 10. Pre-fetched CRL list format (cards array)    → revoked detection
 */
import {
  generateKeyPair,
  issueATC,
} from '../../atc-sdk/src/index.mjs';
import {
  verifyATC,
  verifyTrust,
  verifySelfDescribedSignature,
} from '../lib/atc-verify.mjs';
import assert from 'node:assert';

let passed = 0;
function ok(cond, label) {
  if (!cond) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
  passed++;
  console.log(`PASS: ${label}`);
}

const ca = generateKeyPair();
const agent = generateKeyPair();
const atc = issueATC(ca, agent, {
  card_id: 'ATC-2026-9900001',
  identity: { agent_id: 'test-001', agent_name: 'Test', agent_owner: 'Org' },
  capabilities: {
    filesystem: { read: 'own_dir', write: 'own_dir' },
    network: { egress: 'allowlist', ingress: 'none' },
    shell: { exec: 'sandboxed', spawn: 'none' },
    credentials: { read_env: 'none', read_files: 'none' },
    process: { subprocess: 'none', signals: 'own' },
  },
  evidence: {
    audit_pipeline: 'Sentinel L1.5',
    audit_completed_at: '2026-09-26T00:00:00Z',
    static_checks: {
      metadata: true, semgrep_rules_count: 36, secret_patterns_count: 18,
      dependency_scan: true, malware_patterns_count: 8,
      malware_family_signatures_count: 48, prompt_injection_rules_count: 32,
    },
    dynamic_checks: {
      sandbox_run: true, sandbox_runtime_ms: 12453, sandbox_exit_code: 0,
      sandbox_network_blocked: true, sandbox_fs_read_only: true,
      sandbox_cap_drop_all: true,
    },
    runtime_checks: { interceptor_rules_count: 5, interceptor_blocks: 0, interceptor_warns: 0 },
    findings: [],
  },
  risk: {
    trust_score: 9, risk_level: 'low', score_explanation: 'clean',
    scored_at: '2026-09-26T00:00:00Z', decision_authority: 'consumer',
  },
});

// ─── Case 1: no trusted CA → CONFIGURATION_ERROR + revocation DENY ─────────
let r = verifyATC(atc);
ok(r.valid === false, 'C1: no options → valid=false (fail-closed)');
ok(r.verification_mode === 'TRUST', 'C1: default mode is TRUST');
ok(r.trust_decision === 'DENY', 'C1: trust_decision=DENY');
ok(r.errors.some(e => e.includes('CONFIGURATION_ERROR')), 'C1: CONFIGURATION_ERROR present');
ok(r.errors.some(e => e.includes('fail-closed')), 'C1: ATC-007 fail-closed error present');

// ─── Case 2: trusted CA but no revocation evidence → DENY ─────────────────
r = verifyATC(atc, { trusted_ca: ca.publicKey });
ok(r.valid === false, 'C2: trusted CA without revocation → valid=false');
ok(r.errors.some(e => e.includes('ATC-007: DENY')), 'C2: ATC-007 DENY present');

// ─── Case 3: full trust inputs → valid ─────────────────────────────────────
r = verifyATC(atc, { trusted_ca: ca.publicKey, revocation_status: { revoked: false } });
ok(r.valid === true, 'C3: trusted CA + not-revoked → valid=true');
ok(r.trust_decision === 'TRUST', 'C3: trust_decision=TRUST');
ok(r.controls_passed.includes('ATC-006') && r.controls_passed.includes('ATC-007'), 'C3: ATC-006 + ATC-007 pass');

// ─── Case 4: revoked → DENY ────────────────────────────────────────────────
r = verifyATC(atc, {
  trusted_ca: ca.publicKey,
  revocation_status: { revoked: true, reason: 'key compromise', revoked_at: '2026-09-25T00:00:00Z' },
});
ok(r.valid === false, 'C4: revoked → valid=false');
ok(r.errors.some(e => e.includes('REVOKED')), 'C4: REVOKED error present');

// ─── Case 5: wrong CA → signature fails ────────────────────────────────────
const wrongCA = generateKeyPair();
r = verifyATC(atc, { trusted_ca: wrongCA.publicKey, revocation_status: { revoked: false } });
ok(r.valid === false, 'C5: wrong trusted CA → valid=false');
ok(r.controls_failed.includes('ATC-006'), 'C5: ATC-006 failed');

// ─── Case 6: self-described mode → math valid, labeled NOT a trust decision
r = verifyATC(atc, { mode: 'self_described' });
ok(r.valid === true, 'C6: self-described math → valid=true');
ok(r.verification_mode === 'SELF_DESCRIBED', 'C6: mode label SELF_DESCRIBED');
ok(r.trust_decision === 'NOT_APPLICABLE', 'C6: trust_decision=NOT_APPLICABLE');
ok(r.warnings.some(w => w.includes('NOT a trust decision')), 'C6: explicit warning present');

// ─── Case 7: verifyTrust wrapper ───────────────────────────────────────────
r = verifyTrust(atc); // no trusted CA
ok(r.valid === false && r.verification_mode === 'TRUST', 'C7: verifyTrust() fail-closed without CA');
r = verifyTrust(atc, { trusted_ca: ca.publicKey, revocation_status: { revoked: false } });
ok(r.valid === true, 'C7: verifyTrust() with full inputs → valid');

// ─── Case 8: verifySelfDescribedSignature wrapper ──────────────────────────
r = verifySelfDescribedSignature(atc);
ok(r.valid === true && r.trust_decision === 'NOT_APPLICABLE', 'C8: wrapper self-described');

// ─── Case 9: tampered payload in self-described mode ───────────────────────
const tampered = JSON.parse(JSON.stringify(atc));
tampered.risk.trust_score = 10; // mutate after signing
r = verifySelfDescribedSignature(tampered);
ok(r.valid === false, 'C9: tampered payload → valid=false (hash binding)');
ok(r.controls_failed.includes('ATC-006'), 'C9: ATC-006 failed');

// ─── Case 10: pre-fetched CRL list (cards array format) ────────────────────
const crl = {
  cards: [
    { card_id: 'ATC-2026-8888888', status: 'revoked', reason: 'test' },
    { card_id: 'ATC-2026-9900001', status: 'revoked', reason: 'compromise', revoked_at: '2026-09-25T00:00:00Z' },
  ],
};
r = verifyATC(atc, { trusted_ca: ca.publicKey, revocation_status: crl });
ok(r.valid === false, 'C10: CRL list revoked → valid=false');
ok(r.errors.some(e => e.includes('REVOKED') && e.includes('compromise')), 'C10: revoked reason reported');

// not-revoked via CRL with active status
const crl2 = { cards: [{ card_id: 'ATC-2026-9900001', status: 'active' }] };
r = verifyATC(atc, { trusted_ca: ca.publicKey, revocation_status: crl2 });
ok(r.valid === true, 'C10b: CRL active status → valid=true');

console.log(`\nALL ${passed} CASES PASSED — v1.11.0 fail-closed security model verified.`);
