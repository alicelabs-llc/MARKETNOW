/**
 * MarketNow — Community Skill Report Endpoint
 * ============================================
 *
 * Allows MCP clients and users to anonymously report unexpected behavior,
 * execution failures, or suspected malicious activity in a skill.
 *
 * If a skill accumulates multiple reports in a short period, Sentinel
 * prioritizes it for immediate human review.
 *
 * AUTO-L2-TRIGGER: If the reported skill has source.url pointing to a
 * GitHub repo AND has no L2 result yet (or the existing result is older
 * than 7 days), we automatically fire a repository_dispatch to re-run
 * the L2 Docker sandbox. Reports are a strong signal that something may
 * have changed in the skill's behavior — worth a fresh sandbox run.
 *
 * Endpoint: POST /api/report-skill
 * Body: {
 *   "skillId": "mn-gen-00003",
 *   "reportType": "unexpected_behavior" | "execution_failure" | "suspected_malicious" | "security_issue" | "other",
 *   "description": "What happened",
 *   "agentId": "optional, for tracking",
 *   "anonymous": true
 * }
 *
 * Reports are stored as JSON files in _data/reports/ (git commits, like mandates).
 * No PII collected unless explicitly provided.
 */

import { triggerL2, getL2Results } from '../lib/sentinel-l2-trigger.mjs';
import { findSkill } from '../lib/skills-cache.mjs';

function jsonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', '*');
}

const VALID_REPORT_TYPES = [
  'unexpected_behavior',
  'execution_failure',
  'suspected_malicious',
  'security_issue',
  'other',
];

const REPORTS_PATH = '_data/reports';

// L2 re-audit threshold: if existing L2 result is older than this, re-trigger.
const L2_REAUDIT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function ghWriteReport(report) {
  const cfg = {
    token: process.env.MANDATES_GITHUB_TOKEN,
    repo: process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow',
    branch: process.env.MANDATES_BRANCH || 'master',
    path: REPORTS_PATH,
  };
  if (!cfg.token) {
    // Memory fallback
    console.log('[report-skill] No GitHub token, logging to console:', JSON.stringify(report));
    return;
  }
  const filename = `report_${report.id}.json`;
  const fileUrl = `https://api.github.com/repos/${cfg.repo}/contents/${encodeURIComponent(cfg.path)}/${filename}?ref=${encodeURIComponent(cfg.branch)}`;
  const body = {
    message: `report: ${report.reportType} for ${report.skillId}`,
    content: Buffer.from(JSON.stringify(report, null, 2)).toString('base64'),
    branch: cfg.branch,
  };
  try {
    const r = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'User-Agent': 'marketnow-reports',
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      console.error('ghWriteReport failed:', r.status, await r.text());
    }
  } catch (e) {
    console.error('ghWriteReport error:', e);
  }
}

/**
 * Auto-trigger L2 sandbox re-audit if the reported skill has a GitHub
 * repo and either (a) has no L2 result yet, or (b) the existing result
 * is older than L2_REAUDIT_AGE_MS.
 *
 * This runs in the background — the report response is returned
 * immediately, the L2 dispatch is fire-and-forget.
 */
async function maybeTriggerL2Reaudit(skillId) {
  try {
    const skill = await findSkill(skillId);
    if (!skill) return { triggered: false, reason: 'skill_not_found' };
    if (!skill.source?.url || !skill.source.url.includes('github.com')) {
      return { triggered: false, reason: 'no_github_repo' };
    }

    // Check existing L2 result age
    const existing = await getL2Results(skill.id);
    if (existing?.timestamp) {
      const age = Date.now() - new Date(existing.timestamp).getTime();
      if (age < L2_REAUDIT_AGE_MS) {
        return {
          triggered: false,
          reason: `recent_l2_result (${Math.round(age / (24 * 60 * 60 * 1000))}d old, threshold ${L2_REAUDIT_AGE_MS / (24 * 60 * 60 * 1000)}d)`,
        };
      }
    }

    // Fire the dispatch
    const result = await triggerL2(skill.id, skill.source.url);
    return {
      triggered: result.triggered,
      deduped: result.deduped || false,
      reason: result.triggered ? 'dispatched' : (result.deduped ? 'deduped' : result.message),
    };
  } catch (e) {
    console.error('[report-skill] L2 re-audit trigger error:', e);
    return { triggered: false, reason: `error: ${e.message}` };
  }
}

export default async function handler(req, res) {
  jsonHeaders(res);
  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { skillId, reportType, description, agentId, anonymous } = req.body || {};

    if (!skillId || !reportType || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['skillId', 'reportType', 'description'],
        valid_report_types: VALID_REPORT_TYPES,
      });
    }

    if (!VALID_REPORT_TYPES.includes(reportType)) {
      return res.status(400).json({
        error: 'Invalid reportType',
        valid_types: VALID_REPORT_TYPES,
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({ error: 'Description too long (max 5000 chars)' });
    }

    const report = {
      id: `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      skillId,
      reportType,
      description: description.slice(0, 5000),
      agentId: agentId || null,
      anonymous: anonymous !== false,
      timestamp: new Date().toISOString(),
      status: 'pending_review',
      ip_hash: null, // we don't store IPs, but could hash for dedup
    };

    // Write to GitHub (async, don't block response)
    ghWriteReport(report).catch(e => console.error('Report write failed:', e));

    // ─── Auto-trigger L2 re-audit if eligible ──────────────────────────
    // A user report is a strong signal that something may have changed in
    // the skill's behavior. If the skill has a GitHub repo and its L2
    // result is stale or missing, we fire a fresh sandbox run.
    //
    // For 'security_issue' and 'suspected_malicious' reports, we ALWAYS
    // re-trigger (even if recent) — the user is telling us something is
    // wrong, so we should re-verify.
    const isSecurityRelevant = reportType === 'security_issue' || reportType === 'suspected_malicious';
    let l2Reaudit = { triggered: false, reason: 'not_attempted' };
    if (isSecurityRelevant) {
      // Force re-trigger for security reports (bypass the age check by
      // calling triggerL2 directly — but the 30-min dedup cache still
      // applies to prevent abuse).
      try {
        const skill = await findSkill(skillId);
        if (skill?.source?.url?.includes('github.com')) {
          const result = await triggerL2(skill.id, skill.source.url);
          l2Reaudit = {
            triggered: result.triggered,
            deduped: result.deduped || false,
            reason: result.triggered ? 'dispatched (security report forces re-audit)' : (result.deduped ? 'deduped (30min window)' : result.message),
          };
        } else {
          l2Reaudit = { triggered: false, reason: 'no_github_repo' };
        }
      } catch (e) {
        l2Reaudit = { triggered: false, reason: `error: ${e.message}` };
      }
    } else {
      // Non-security reports: use the age-based threshold
      l2Reaudit = await maybeTriggerL2Reaudit(skillId);
    }

    return res.status(201).json({
      success: true,
      reportId: report.id,
      message: 'Report received. If this skill accumulates multiple reports, it will be prioritized for human review.',
      disclosure: 'Reports are stored as public git commits at _data/reports/ for transparency. No PII collected unless you explicitly provide it.',
      view_reports: 'https://github.com/edgarfloresguerra2011-a11y/marketnow/tree/master/_data/reports',
      // New: surface the L2 re-audit decision to the user
      l2_reaudit: l2Reaudit,
    });
  } catch (err) {
    console.error('Report error:', err);
    return res.status(500).json({ error: 'report_failed', message: err.message });
  }
}
