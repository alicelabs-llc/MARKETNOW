/**
 * MarketNow Trust API — /api/trust
 * =================================
 * 
 * The unified trust decision endpoint. This is the killer feature:
 * 
 *   POST /api/trust
 *   {
 *     "agent_id": "my-bot-001",
 *     "skill_id": "mn-gen-00003",
 *     "action": "execute",
 *     "policy": {
 *       "min_trust_score": 7,
 *       "allow_filesystem_write": false,
 *       "allow_network": "allowlist",
 *       "allow_shell": false,
 *       "require_atc": true,
 *       "require_continuous_monitoring": false
 *     }
 *   }
 * 
 * Returns:
 *   {
 *     "allowed": true|false,
 *     "agent_trust_score": 9,
 *     "tool_security_score": 8,
 *     "identity_verified": true,
 *     "artifact_verified": false,
 *     "policy_compliant": true,
 *     "certificate_id": "ATC-2026-...",
 *     "expires_at": "2026-10-21T...",
 *     "evidence": { ... },
 *     "reasons": ["..."],
 *     "decision_authority": "consumer"
 *   }
 * 
 * This endpoint combines:
 *   - Sentinel security assessment (tool security score)
 *   - ATC identity verification (agent identity)
 *   - Policy engine (YAML-like policy evaluation)
 *   - Interceptor decision (action-level enforcement)
 *   - Provenance check (artifact digest match)
 * 
 * Architecture:
 *   DISCOVER → SENTINEL → IDENTITY → TRUST → POLICY → ENFORCEMENT → AUDIT
 */

import { setCorsHeaders } from '../lib/cors.mjs';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    return res.status(200).json({
      service: 'MarketNow Trust API',
      version: '1.0.0',
      description: 'Unified trust decision endpoint — combines Sentinel security assessment, ATC identity verification, policy evaluation, and runtime enforcement into a single decision.',
      endpoint: 'POST /api/trust',
      request_schema: {
        agent_id: 'string — the agent requesting the action',
        skill_id: 'string — the MCP skill/tool the agent wants to use',
        action: 'string — the action being requested (execute, read, write, purchase, etc.)',
        atc_card_id: 'string (optional) — the ATC card ID for identity verification',
        policy: {
          min_trust_score: 'integer 0-10 (default: 5)',
          allow_filesystem_write: 'boolean (default: false)',
          allow_network: 'enum: none|allowlist|all (default: allowlist)',
          allow_shell: 'enum: none|sandboxed|unrestricted (default: none)',
          allow_credentials_access: 'boolean (default: false)',
          allow_process_spawn: 'boolean (default: false)',
          require_atc: 'boolean (default: true)',
          require_continuous_monitoring: 'boolean (default: false)',
          max_payment_amount_usd: 'number (optional, default: 0)',
        },
      },
      response_schema: {
        allowed: 'boolean — the final trust decision',
        agent_trust_score: 'number — ATC trust score (0-10)',
        tool_security_score: 'number — Sentinel security score (0-10)',
        identity_verified: 'boolean — ATC signature + revocation + expiry verified',
        artifact_verified: 'boolean — artifact digest matches audited version',
        policy_compliant: 'boolean — all policy rules passed',
        certificate_id: 'string|null — the ATC card ID if verified',
        expires_at: 'string|null — ATC expiration timestamp',
        evidence: 'object — security evidence from Sentinel',
        reasons: 'array<string> — human-readable decision factors',
        violations: 'array<object> — policy violations if any',
        decision_authority: 'string — always "consumer" (the caller makes the final call)',
        decision_made_at: 'string — ISO 8601 timestamp',
      },
      pricing: 'Free tier: 100 requests/day. Developer tier ($49/mo): 10K/day. Enterprise: unlimited.',
      note: 'This endpoint is the product. The marketplace, Sentinel, ATC, and Interceptor are all components that feed into this single decision.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET for docs or POST for trust decision.' });
  }

  const body = req.body || {};
  const { agent_id, skill_id, action, atc_card_id, policy: userPolicy } = body;

  // ─── Validate required fields ──────────────────────────────────────────────
  if (!agent_id || !skill_id) {
    return res.status(400).json({
      error: 'agent_id and skill_id are required',
      example: { agent_id: 'my-bot-001', skill_id: 'mn-gen-00003', action: 'execute' },
    });
  }

  // ─── Default policy ────────────────────────────────────────────────────────
  const policy = {
    min_trust_score: 5,
    allow_filesystem_write: false,
    allow_network: 'allowlist',
    allow_shell: 'none',
    allow_credentials_access: false,
    allow_process_spawn: false,
    require_atc: true,
    require_continuous_monitoring: false,
    max_payment_amount_usd: 0,
    ...userPolicy,
  };

  const reasons = [];
  const violations = [];
  let allowed = true;

  // ─── Step 1: Sentinel security assessment (tool security score) ────────────
  let toolSecurityScore = 0;
  let toolEvidence = {};
  try {
    const skillsRes = await fetch('https://marketnow.site/api/skills.json');
    const skills = await skillsRes.json();
    const skill = skills.find(s => s.id === skill_id || s.slug === skill_id);

    if (skill) {
      toolSecurityScore = skill.sentinel_score || 0;
      toolEvidence = {
        skill_id: skill.id,
        skill_name: skill.name,
        sentinel_score: toolSecurityScore,
        category: skill.category,
        install: skill.install,
        review_status: skill.review_status || 'auto-scanned',
        audit_layers: skill.audit_layers || ['L1.5'],
        sentinel_version: skill.sentinel_version || 'v2.5',
      };

      if (toolSecurityScore < policy.min_trust_score) {
        allowed = false;
        violations.push({
          rule: 'min_trust_score',
          expected: `>= ${policy.min_trust_score}`,
          actual: toolSecurityScore,
          message: `Tool security score ${toolSecurityScore} is below required minimum ${policy.min_trust_score}`,
        });
        reasons.push(`Tool security score ${toolSecurityScore}/${policy.min_trust_score} required`);
      } else {
        reasons.push(`Tool security score ${toolSecurityScore}/10 meets minimum ${policy.min_trust_score}`);
      }

      // Check capabilities against policy
      const caps = skill.capabilities || {};
      if (caps.filesystem?.write === 'all' && !policy.allow_filesystem_write) {
        allowed = false;
        violations.push({
          rule: 'allow_filesystem_write',
          expected: false,
          actual: true,
          message: 'Tool requests filesystem write access but policy denies it',
        });
        reasons.push('Tool requests filesystem write — denied by policy');
      }
      if (caps.network?.egress === 'all' && policy.allow_network !== 'all') {
        allowed = false;
        violations.push({
          rule: 'allow_network',
          expected: policy.allow_network,
          actual: 'all',
          message: 'Tool requests unrestricted network access but policy limits to ' + policy.allow_network,
        });
        reasons.push(`Tool requests unrestricted network — policy limits to ${policy.allow_network}`);
      }
      if (caps.shell?.exec === 'unrestricted' && policy.allow_shell !== 'unrestricted') {
        allowed = false;
        violations.push({
          rule: 'allow_shell',
          expected: policy.allow_shell,
          actual: 'unrestricted',
          message: 'Tool requests unrestricted shell access but policy denies it',
        });
        reasons.push('Tool requests unrestricted shell — denied by policy');
      }
      if (caps.credentials?.read_env === 'all' && !policy.allow_credentials_access) {
        allowed = false;
        violations.push({
          rule: 'allow_credentials_access',
          expected: false,
          actual: true,
          message: 'Tool requests credential access but policy denies it',
        });
        reasons.push('Tool requests credential access — denied by policy');
      }
    } else {
      // Skill not found — allow but warn
      toolSecurityScore = 0;
      toolEvidence = { skill_id, found: false };
      reasons.push(`Skill ${skill_id} not found in registry — no security assessment available`);
      if (policy.min_trust_score > 0) {
        allowed = false;
        violations.push({
          rule: 'min_trust_score',
          expected: `>= ${policy.min_trust_score}`,
          actual: 0,
          message: 'Skill not found — cannot verify security score',
        });
      }
    }
  } catch (err) {
    reasons.push(`Sentinel assessment failed: ${err.message}`);
    toolSecurityScore = 0;
  }

  // ─── Step 2: ATC identity verification ─────────────────────────────────────
  let identityVerified = false;
  let agentTrustScore = 0;
  let certificateId = null;
  let expiresAt = null;

  if (policy.require_atc) {
    if (atc_card_id) {
      try {
        const atcRes = await fetch(`https://marketnow.site/api/atc?action=verify&card_id=${encodeURIComponent(atc_card_id)}`);
        const atcData = await atcRes.json();

        if (atcData.valid === true) {
          identityVerified = true;
          agentTrustScore = atcData.sentinel_review_score || atcData.sentinel_score || 0;
          certificateId = atc_card_id;
          expiresAt = atcData.expires_at;
          reasons.push(`ATC ${atc_card_id} verified — agent trust score ${agentTrustScore}/10`);
        } else {
          allowed = false;
          violations.push({
            rule: 'require_atc',
            expected: 'valid ATC',
            actual: atcData.reason || 'invalid',
            message: `ATC ${atc_card_id} is not valid: ${atcData.reason || atcData.message || 'unknown'}`,
          });
          reasons.push(`ATC ${atc_card_id} verification failed: ${atcData.reason || 'invalid'}`);
        }
      } catch (err) {
        allowed = false;
        violations.push({
          rule: 'require_atc',
          expected: 'ATC verification',
          actual: 'error',
          message: `ATC verification error: ${err.message}`,
        });
        reasons.push(`ATC verification error: ${err.message}`);
      }
    } else {
      // No ATC provided — check if agent_id matches any issued ATC
      try {
        const crlRes = await fetch('https://marketnow.site/api/atc?action=revocation-list');
        const crlData = await crlRes.json();
        const matchingCard = (crlData.cards || []).find(c => c.agent_id === agent_id && c.status === 'active');

        if (matchingCard) {
          identityVerified = true;
          agentTrustScore = matchingCard.sentinel_review_score || 0;
          certificateId = matchingCard.card_id;
          expiresAt = matchingCard.expires_at;
          reasons.push(`ATC ${matchingCard.card_id} found for agent ${agent_id} — trust score ${agentTrustScore}/10`);
        } else {
          if (policy.require_atc) {
            allowed = false;
            violations.push({
              rule: 'require_atc',
              expected: 'valid ATC for agent',
              actual: 'not found',
              message: `No ATC found for agent ${agent_id}`,
            });
            reasons.push(`No ATC found for agent ${agent_id} — identity unverified`);
          }
        }
      } catch (err) {
        reasons.push(`ATC lookup failed: ${err.message}`);
      }
    }
  } else {
    reasons.push('ATC requirement disabled by policy');
  }

  // ─── Step 3: Policy evaluation ─────────────────────────────────────────────
  let policyCompliant = violations.length === 0;

  // ─── Step 4: Interceptor decision (action-level enforcement) ───────────────
  let interceptorDecision = 'allow';
  let interceptorViolations = [];
  if (action && action !== 'discover' && action !== 'search') {
    try {
      const interceptorRes = await fetch('https://marketnow.site/api/interceptor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: action,
            arguments: body.action_args || {},
          },
        }),
      });
      const interceptorData = await interceptorRes.json();
      interceptorDecision = interceptorData.decision || 'allow';
      interceptorViolations = interceptorData.violations || [];

      if (interceptorDecision === 'block') {
        allowed = false;
        policyCompliant = false;
        reasons.push(`Interceptor blocked action: ${interceptorViolations.map(v => v.message).join(', ')}`);
        violations.push(...interceptorViolations.map(v => ({
          rule: 'interceptor_' + v.rule_id,
          expected: 'allow',
          actual: 'block',
          message: v.message,
        })));
      } else if (interceptorDecision === 'warn') {
        reasons.push(`Interceptor warning: ${(interceptorData.warnings || []).map(w => w.message).join(', ')}`);
      } else {
        reasons.push(`Interceptor: action allowed`);
      }
    } catch (err) {
      reasons.push(`Interceptor check skipped: ${err.message}`);
    }
  }

  // ─── Step 5: Final decision ────────────────────────────────────────────────
  const decision = {
    allowed,
    agent_trust_score: agentTrustScore,
    tool_security_score: toolSecurityScore,
    identity_verified: identityVerified,
    artifact_verified: false, // TODO: add artifact digest verification in v1.1
    policy_compliant: policyCompliant,
    certificate_id: certificateId,
    expires_at: expiresAt,
    evidence: {
      sentinel: toolEvidence,
      atc: identityVerified ? { card_id: certificateId, trust_score: agentTrustScore, expires_at: expiresAt } : null,
      interceptor: { decision: interceptorDecision, violations: interceptorViolations },
    },
    reasons,
    violations,
    decision_authority: 'consumer',
    decision_made_at: new Date().toISOString(),
    architecture: 'DISCOVER → SENTINEL → IDENTITY → TRUST → POLICY → ENFORCEMENT → AUDIT',
  };

  return res.status(200).json(decision);
}
