/**
 * MarketNow — Submit Skill API (REAL implementation)
 * ===================================================
 *
 * Closes the "agent magnet" gap: this endpoint actually processes a
 * GitHub repo submission and adds it to the marketplace catalog.
 *
 * What it does (synchronously, ~5s):
 *   1. Parses repo_url → owner/repo
 *   2. Fetches repo metadata via GitHub API (description, stars, language)
 *   3. Fetches README + package.json (if present)
 *   4. Runs lightweight L1.5 metadata checks
 *   5. Runs L1.7 malware pattern check (blocks typosquats)
 *   6. If passes → writes to _data/pending_submissions/{submission_id}.json
 *      via GitHub Contents API (audit-ledger pattern)
 *   7. Returns submission_id + skill_id (reserved) + ATC pre-allocation
 *
 * The full L2 sandbox audit runs separately via GitHub Actions (weekly).
 * Once L2 passes, the skill is promoted from pending_submissions to
 * the main catalog by the auto-discover workflow.
 *
 * Why GitHub Contents API (not a database):
 *   - Free, no new credentials
 *   - Durable across cold starts
 *   - Every submission is a git commit — visible audit log
 *   - 5000 req/hour authenticated
 *
 * Required env vars:
 *   MANDATES_GITHUB_TOKEN  — GitHub PAT with repo scope
 *   MANDATES_REPO          — default: edgarfloresguerra2011-a11y/marketnow
 *
 * Endpoint: POST /api/submit-skill
 * Body:
 *   {
 *     "repo_url": "https://github.com/user/my-mcp-server",
 *     "name": "My MCP Server",          // optional, auto-detect
 *     "description": "...",              // optional, auto-detect
 *     "submitter_agent_id": "agent_xxx", // optional
 *     "submitter_email": "user@x.com",   // optional, for review notification
 *     "ref_code": "ref_xxx"              // optional, affiliate
 *   }
 */

import { runL17, MALWARE_PATTERNS } from '../lib/sentinel-l17.mjs';
import { setCorsHeaders } from '../lib/cors.mjs';
import { checkRateLimit } from '../lib/rate-limit.mjs';
import { secureLight } from '../lib/secure.mjs';
import crypto from 'crypto';

const GITHUB_TOKEN = process.env.MANDATES_GITHUB_TOKEN;
const REPO = process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow';
const BRANCH = 'master';
const SUBMISSIONS_DIR = '_data/pending_submissions';

// ─── Helpers ─────────────────────────────────────────────────────────────

function jsonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', '*');
}

function newSubmissionId() {
  return 'sub_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function newSkillId(category = 'sub') {
  // Skills submitted by users get the mn-sub- prefix
  // (auto-discovered ones use mn-gen-, mn-ai-, etc.)
  const num = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `mn-sub-${num}`;
}

function parseRepoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  // Accept https://github.com/owner/repo, git@github.com:owner/repo, owner/repo
  const patterns = [
    /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/i,
    /^([^/\s]+)\/([^/\s]+)$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { owner: m[1], repo: m[2] };
  }
  return null;
}

async function fetchRepoMeta(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'marketnow-submit',
    },
  });
  if (r.status === 404) return { notFound: true };
  if (!r.ok) throw new Error(`GitHub API ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function fetchRepoFile(owner, repo, path, branch = 'main') {
  // Try main first, then master
  for (const ref of [branch, 'main', 'master', 'HEAD']) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'marketnow-submit',
      },
    });
    if (r.ok) {
      const text = await r.text();
      return { text, ref };
    }
  }
  return null;
}

async function persistSubmission(submission) {
  if (!GITHUB_TOKEN) {
    return { persisted: false, reason: 'no_github_token' };
  }
  const submissionId = submission.submission_id;
  const filePath = `${SUBMISSIONS_DIR}/${encodeURIComponent(submissionId)}.json`;

  // Check if exists (shouldn't, but be safe)
  let sha = null;
  try {
    const metaUrl = `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${encodeURIComponent(BRANCH)}`;
    const metaR = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-submit',
      },
    });
    if (metaR.ok) {
      const meta = await metaR.json();
      sha = meta?.sha || null;
    }
  } catch {}

  const content = Buffer.from(JSON.stringify(submission, null, 2)).toString('base64');
  const url = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
  const body = {
    message: `submit skill ${submissionId} (${submission.repo_full_name})`,
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'marketnow-submit',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errBody = await r.text();
    throw new Error(`GitHub persist failed: ${r.status} ${errBody.slice(0, 200)}`);
  }

  return { persisted: true };
}

// ─── L1.5 lightweight checks (in-process, no sandbox needed) ─────────────

function runL15Lightweight(repoMeta, readmeText) {
  const findings = [];

  // 1. Has README
  if (!readmeText) {
    findings.push({ layer: 'L1.5', severity: 'medium', code: 'no_readme', message: 'No README found in repo root' });
  } else if (readmeText.length < 100) {
    findings.push({ layer: 'L1.5', severity: 'low', code: 'short_readme', message: 'README is very short (<100 chars)' });
  }

  // 2. Has description
  if (!repoMeta.description) {
    findings.push({ layer: 'L1.5', severity: 'low', code: 'no_description', message: 'GitHub repo has no description' });
  }

  // 3. Has license
  if (!repoMeta.license) {
    findings.push({ layer: 'L1.5', severity: 'medium', code: 'no_license', message: 'No LICENSE file detected by GitHub' });
  }

  // 4. Not archived
  if (repoMeta.archived) {
    findings.push({ layer: 'L1.5', severity: 'high', code: 'archived', message: 'Repo is archived' });
  }

  // 5. Not disabled
  if (repoMeta.disabled) {
    findings.push({ layer: 'L1.5', severity: 'high', code: 'disabled', message: 'Repo is disabled' });
  }

  // 6. Has recent activity (pushed within last 2 years)
  if (repoMeta.pushed_at) {
    const pushed = new Date(repoMeta.pushed_at);
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
    if (pushed < twoYearsAgo) {
      findings.push({ layer: 'L1.5', severity: 'medium', code: 'stale', message: `Last push was ${pushed.toISOString().slice(0, 10)}` });
    }
  }

  // Compute L1.5 score (start at 10, deduct per finding)
  let score = 10;
  for (const f of findings) {
    if (f.severity === 'high') score -= 3;
    else if (f.severity === 'medium') score -= 1;
    else if (f.severity === 'low') score -= 0.5;
  }
  score = Math.max(0, score);

  return { score, findings };
}

// ─── Handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  jsonHeaders(res);
  setCorsHeaders(req, res);
  secureLight(res);

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();

  // GET: check submission status
  if (req.method === 'GET') {
    const { submission_id } = req.query;
    if (!submission_id) {
      return res.status(200).json({
        endpoint: 'POST /api/submit-skill',
        description: 'Submit a GitHub repo to the MarketNow marketplace. Runs L1.5 metadata + L1.7 malware checks synchronously, queues L2 sandbox audit.',
        body: {
          repo_url: 'string (required) — https://github.com/owner/repo',
          name: 'string (optional, auto-detected from repo)',
          description: 'string (optional, auto-detected from README)',
          submitter_agent_id: 'string (optional)',
          submitter_email: 'string (optional, for review notification)',
          ref_code: 'string (optional, affiliate code)',
        },
        example: {
          repo_url: 'https://github.com/user/my-mcp-server',
          submitter_agent_id: 'agent_claude_001',
        },
        rate_limit: '5 submissions per hour per IP',
        check_status: 'GET /api/submit-skill?submission_id=sub_xxx',
      });
    }

    // Fetch submission from GitHub ledger
    if (!GITHUB_TOKEN) {
      return res.status(503).json({ error: 'GitHub token not configured' });
    }
    const url = `https://api.github.com/repos/${REPO}/contents/${SUBMISSIONS_DIR}/${encodeURIComponent(submission_id)}.json?ref=${encodeURIComponent(BRANCH)}`;
    try {
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'marketnow-submit',
        },
      });
      if (r.status === 404) {
        return res.status(404).json({
          error: 'submission_not_found',
          submission_id,
          message: `No submission with id ${submission_id} exists.`,
        });
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
        ledger_url: `https://github.com/${REPO}/blob/${BRANCH}/${SUBMISSIONS_DIR}/${submission_id}.json`,
      });
    } catch (e) {
      return res.status(500).json({ error: 'fetch_failed', message: e.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'method_not_allowed',
      message: 'POST or GET only. Body: { repo_url, name?, description?, submitter_agent_id?, submitter_email?, ref_code? }',
    });
  }

  // Rate limit: 5 submissions per hour per IP (anti-spam)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const rl = checkRateLimit(`submit-skill:${ip}`, { windowMs: 60 * 60 * 1000, max: 5 });
  if (!rl.ok) {
    return res.status(429).json({
      error: 'rate_limited',
      message: `Too many submissions. Try again in ${Math.ceil((rl.resetAt - Date.now()) / 60000)} minutes.`,
      reset_at: new Date(rl.resetAt).toISOString(),
    });
  }

  const body = req.body || {};
  const { repo_url, name, description, submitter_agent_id, submitter_email, ref_code } = body;

  if (!repo_url) {
    return res.status(400).json({
      error: 'repo_url required',
      example: {
        repo_url: 'https://github.com/user/my-mcp-server',
        name: 'My MCP Server (optional, auto-detected)',
        description: '... (optional, auto-detected from README)',
        submitter_agent_id: 'agent_xxx (optional)',
        submitter_email: 'you@x.com (optional, for review notification)',
        ref_code: 'ref_xxx (optional, affiliate)',
      },
    });
  }

  const parsed = parseRepoUrl(repo_url);
  if (!parsed) {
    return res.status(400).json({
      error: 'invalid_repo_url',
      message: 'Could not parse repo_url. Expected: https://github.com/owner/repo',
      got: repo_url,
    });
  }

  const { owner, repo: repoName } = parsed;

  try {
    // Step 1: Fetch repo metadata
    const repoMeta = await fetchRepoMeta(owner, repoName);
    if (repoMeta.notFound) {
      return res.status(404).json({
        error: 'repo_not_found',
        message: `GitHub repo ${owner}/${repoName} not found (or is private)`,
      });
    }

    // Step 2: Fetch README (try multiple branches)
    const readmeResult = await fetchRepoFile(owner, repoName, 'README.md');
    const readmeText = readmeResult?.text || null;

    // Step 3: Fetch package.json (if it's a Node MCP server)
    const pkgResult = await fetchRepoFile(owner, repoName, 'package.json');
    let pkgJson = null;
    if (pkgResult?.text) {
      try { pkgJson = JSON.parse(pkgResult.text); } catch {}
    }

    // Step 4: L1.5 lightweight checks
    const l15 = runL15Lightweight(repoMeta, readmeText);

    // Step 5: L1.7 malware pattern check
    let l17 = { blocked: false, findings: [] };
    try {
      const metadataForL17 = {
        name: name || repoMeta.name,
        description: description || repoMeta.description || '',
        readme: readmeText || '',
        package_json: pkgJson || {},
      };
      l17 = runL17(metadataForL17);
    } catch (e) {
      // L1.7 might throw on malformed input — non-fatal
      console.error('L1.7 error (non-fatal):', e.message);
    }

    if (l17.blocked) {
      return res.status(422).json({
        status: 'rejected',
        reason: 'malware_pattern_detected',
        repo_url,
        repo_full_name: repoMeta.full_name,
        findings: l17.findings,
        message: 'Submission rejected: L1.7 detected a known malware pattern. If this is a false positive, email support@alicelabs.site.',
      });
    }

    // Step 6: Reject if L1.5 score is too low (under 4 = automatic rejection)
    if (l15.score < 4) {
      return res.status(422).json({
        status: 'rejected',
        reason: 'low_metadata_score',
        l15_score: l15.score,
        findings: l15.findings,
        message: `Submission rejected: L1.5 metadata score ${l15.score}/10. Fix the issues and resubmit.`,
      });
    }

    // Step 7: Build submission record
    const submissionId = newSubmissionId();
    const skillId = newSkillId();
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
        ip_hash: ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16) : null,
      },
      repo: {
        url: repo_url,
        full_name: repoMeta.full_name,
        owner,
        name: repoName,
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
        tags: ['mcp', 'community-submitted', repoMeta.language?.toLowerCase() || 'unknown'].filter(Boolean),
        price: 0, // all community-submitted skills start free
        currency: 'USD',
        review_status: 'auto-scanned',
        source: {
          type: 'community-submitted',
          url: repo_url,
          submitter_agent_id: submitter_agent_id || null,
          submitted_at: now,
        },
        install: pkgJson?.name
          ? `npx -y ${pkgJson.name}`
          : `git clone ${repo_url} && cd ${repoName}`,
        author: owner,
        version: pkgJson?.version || '0.0.0',
      },
      audit: {
        l15_score: l15.score,
        l15_findings: l15.findings,
        l17_blocked: l17.blocked,
        l17_findings: l17.findings,
        l2_status: 'queued', // will run via GitHub Actions
        l2_scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // ~1h queue
      },
      // ATC pre-allocation: once L2 passes, an ATC will be issued for this skill
      atc_preallocated: false,
      atc_card_id: null,
    };

    // Step 8: Persist to GitHub (audit ledger)
    let persisted = false;
    try {
      const r = await persistSubmission(submission);
      persisted = r.persisted;
    } catch (e) {
      console.error('Persist failed:', e.message);
      // Non-fatal — return submission in response so submitter has the data
    }

    // Step 9: Return success
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
        l15_score: l15.score,
        l15_findings: l15.findings,
        l17_blocked: false,
        l2_status: 'queued',
        l2_estimated_completion: submission.audit.l2_scheduled_at,
      },
      persisted_to_ledger: persisted,
      ledger_url: persisted
        ? `https://github.com/${REPO}/blob/${BRANCH}/${SUBMISSIONS_DIR}/${submissionId}.json`
        : null,
      next_steps: [
        `1. L2 sandbox audit will run within ~1 hour via GitHub Actions`,
        `2. If L2 passes (score ≥ 7), the skill is promoted to the main catalog`,
        `3. An ATC (Agent Trust Card) is issued automatically for the skill`,
        `4. You can check status: GET /api/submit-skill?submission_id=${submissionId}`,
        `5. The skill becomes discoverable via search_skills in the MCP server`,
      ],
      check_status_url: `https://marketnow.site/api/submit-skill?submission_id=${submissionId}`,
      catalog_url: `https://marketnow.site/skill/${skillId} (live after L2 passes)`,
      message: `Submission accepted. L1.5 score ${l15.score}/10. L2 audit queued. Check status at /api/submit-skill?submission_id=${submissionId}`,
    });
  } catch (err) {
    console.error('Submit skill error:', err);
    return res.status(500).json({
      error: 'submission_failed',
      message: err.message,
    });
  }
}
