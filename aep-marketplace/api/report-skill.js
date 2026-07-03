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

    return res.status(201).json({
      success: true,
      reportId: report.id,
      message: 'Report received. If this skill accumulates multiple reports, it will be prioritized for human review.',
      disclosure: 'Reports are stored as public git commits at _data/reports/ for transparency. No PII collected unless you explicitly provide it.',
      view_reports: 'https://github.com/edgarfloresguerra2011-a11y/marketnow/tree/master/_data/reports',
    });
  } catch (err) {
    console.error('Report error:', err);
    return res.status(500).json({ error: 'report_failed', message: err.message });
  }
}
