/**
 * SDK (agent-trust-card) v1.2.0 trust-mode tests:
 *  - backward compat (default self-described)
 *  - verifyTrust fail-closed without trusted CA
 *  - sync trust mode requires revocation evidence
 *  - revoked evidence → DENY
 */
import { generateKeyPair, issueATC, verifyATCSync, verifyTrust } from '../src/index.mjs';
import assert from 'node:assert';

let passed = 0;
function ok(cond, label) {
  if (!cond) { console.error(`FAIL: ${label}`); process.exit(1); }
  passed++; console.log(`PASS: ${label}`);
}

const ca = generateKeyPair();
const agent = generateKeyPair();
const atc = issueATC(ca, agent, {
  card_id: 'ATC-2026-9900002',
  identity: { agent_id: 'sdk-002', agent_name: 'SDK', agent_owner: 'Org' },
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
    static_checks: { metadata: true, semgrep_rules_count: 36, secret_patterns_count: 18, dependency_scan: true, malware_patterns_count: 8, malware_family_signatures_count: 48, prompt_injection_rules_count: 32 },
    dynamic_checks: { sandbox_run: true, sandbox_runtime_ms: 1, sandbox_exit_code: 0, sandbox_network_blocked: true, sandbox_fs_read_only: true, sandbox_cap_drop_all: true },
    runtime_checks: { interceptor_rules_count: 5, interceptor_blocks: 0, interceptor_warns: 0 },
    findings: [],
  },
  risk: { trust_score: 9, risk_level: 'low', score_explanation: 'clean', scored_at: '2026-09-26T00:00:00Z', decision_authority: 'consumer' },
});

// S1: backward compat — default self-described, valid=true, labeled + warned
let r = verifyATCSync(atc);
ok(r.valid === true, 'S1: default sync verify → valid=true (compat)');
ok(r.verification_mode === 'SELF_DESCRIBED', 'S1: mode label');
ok(r.trust_decision === 'NOT_APPLICABLE', 'S1: trust_decision label');
ok(r.warnings.some(w => w.includes('NOT a trust decision')), 'S1: loud warning');

// S2: sync TRUST without CA → CONFIGURATION_ERROR fail-closed
r = verifyATCSync(atc, { mode: 'trust' });
ok(r.valid === false, 'S2: mode:trust without CA → DENY');
ok(r.errors.some(e => e.includes('CONFIGURATION_ERROR')), 'S2: CONFIGURATION_ERROR');
ok(r.trust_decision === 'DENY', 'S2: trust_decision=DENY');

// S3: sync TRUST with CA but no revocation evidence → ATC-007 fail-closed
r = verifyATCSync(atc, { trusted_ca: ca.publicKey });
ok(r.valid === false, 'S3: trust + CA, no evidence → DENY (ATC-007)');
ok(r.errors.some(e => e.includes('ATC-007: DENY')), 'S3: ATC-007 DENY message');
ok(r.controls_failed.includes('ATC-007'), 'S3: ATC-007 failed control');

// S4: sync TRUST with CA + clean CRL → valid
const crlClean = { cards: [{ card_id: 'ATC-2026-7777777', status: 'revoked' }] };
r = verifyATCSync(atc, { trusted_ca: ca.publicKey, revocation: crlClean });
ok(r.valid === true, 'S4: trust + CA + clean CRL → valid');
ok(r.trust_decision === 'TRUST', 'S4: trust_decision=TRUST');
ok(r.verification_mode === 'TRUST', 'S4: mode TRUST');

// S5: sync TRUST with CA + revoked in CRL → DENY
const crlBad = { cards: [{ card_id: 'ATC-2026-9900002', status: 'revoked', reason: 'compromise' }] };
r = verifyATCSync(atc, { trusted_ca: ca.publicKey, revocation: crlBad });
ok(r.valid === false, 'S5: revoked in CRL → DENY');
ok(r.errors.some(e => e.includes('revoked')), 'S5: revoked message');
ok(r.revoked === true, 'S5: revoked flag');

// S6: wrong CA in trust mode → signature fails (CA substitution detected)
const wrong = generateKeyPair();
r = verifyATCSync(atc, { trusted_ca: wrong.publicKey, revocation: crlClean });
ok(r.valid === false, 'S6: wrong CA → DENY');
ok(r.controls_failed.includes('ATC-006'), 'S6: ATC-006 failed');

// S7: verifyTrust (async) without CA → fail-closed
r = await verifyTrust(atc);
ok(r.valid === false && r.errors.some(e => e.includes('CONFIGURATION_ERROR')), 'S7: verifyTrust() no CA → CONFIGURATION_ERROR');

// S8: verifyTrust (async) with CA + pre-fetched evidence → valid (no network)
r = await verifyTrust(atc, { trusted_ca: ca.publicKey, revocation: crlClean });
ok(r.valid === true, 'S8: verifyTrust + CA + evidence → valid');
ok(r.trust_decision === 'TRUST', 'S8: TRUST decision');

console.log(`\nALL ${passed} SDK CASES PASSED.`);
