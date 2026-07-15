/**
 * MarketNow — Quarantine API
 * ===========================
 *
 * GET /api/quarantine
 *   Returns the list of skills currently in quarantine (public, transparent).
 *
 * POST /api/quarantine  (internal-only — called by sentinel batch runs)
 *   Body: { skill, findings, certificate }
 *   Moves the skill's certificate to _data/quarantine/ and marks status.
 *
 * The quarantine list is PUBLIC — anyone can see which skills were
 * flagged and why. This is part of the trust layer: hiding quarantined
 * skills would defeat the purpose.
 */

import { setCorsHeaders } from '../lib/cors.mjs';
import { checkRateLimit } from '../lib/rate-limit.mjs';
import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.MANDATES_GITHUB_TOKEN;
const REPO = process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow';
const BRANCH = 'master';
const QUARANTINE_PATH = '_data/quarantine';

function jsonHeaders(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  setCorsHeaders(req, res);
  res.setHeader('Vary', 'Origin');
}

// In-memory cache of quarantine list (5 min TTL)
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchQuarantineList() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) {
    return _cache;
  }
  if (!GITHUB_TOKEN) {
    return { quarantined: [], source: 'github_not_configured' };
  }
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(QUARANTINE_PATH)}?ref=${encodeURIComponent(BRANCH)}`;
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-quarantine',
      },
    });
    if (r.status === 404) {
      _cache = { quarantined: [], source: 'empty' };
      _cacheTime = Date.now();
      return _cache;
    }
    if (!r.ok) {
      return { quarantined: [], source: 'error', error: `GitHub ${r.status}` };
    }
    const files = await r.json();
    if (!Array.isArray(files)) {
      return { quarantined: [], source: 'unexpected_response' };
    }
    // Fetch each quarantine file
    const quarantined = await Promise.all(files
      .filter(f => f.type === 'file' && f.name.endsWith('.json') && f.name !== '_summary.json')
      .map(async f => {
        try {
          const fileRes = await fetch(f.download_url, {
            headers: { 'User-Agent': 'marketnow-quarantine' },
          });
          if (!fileRes.ok) return null;
          const cert = await fileRes.json();
          return {
            skill_id: cert.skill_id || f.name.replace(/\.json$/, ''),
            skill_name: cert.skill_name || cert.skill?.name || '?',
            quarantined_at: cert.quarantined_at || cert.timestamp,
            reason: cert.quarantined_reason || 'L1.7 detected suspicious content',
            risk_level: cert.risk_level || 'critical',
            findings_summary: {
              binary_files: cert.quarantined_findings?.binary_files?.length || 0,
              launcher_scripts: cert.quarantined_findings?.launcher_scripts?.length || 0,
              nested_archives: cert.quarantined_findings?.nested_archives?.length || 0,
              malware_patterns: cert.quarantined_findings?.malware_patterns?.length || 0,
              oversized_text_files: cert.quarantined_findings?.oversized_text_files?.length || 0,
            },
            certificate_url: f.html_url,
          };
        } catch {
          return null;
        }
      })
    );
    _cache = {
      quarantined: quarantined.filter(Boolean),
      source: 'github',
      count: quarantined.filter(Boolean).length,
    };
    _cacheTime = Date.now();
    return _cache;
  } catch (e) {
    return { quarantined: [], source: 'error', error: e.message };
  }
}

export default async function handler(req, res) {
  jsonHeaders(req, res);
  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  if (checkRateLimit(req, res, 'default')) return;

  try {
    const data = await fetchQuarantineList();
    return res.status(200).json({
      endpoint: '/api/quarantine',
      description: 'Public list of skills quarantined by Sentinel L1.7 (binary/malware detection). Each entry shows why the skill was quarantined and links to its certificate.',
      policy: 'Skills in quarantine are removed from the public catalog. They cannot be purchased or installed via MarketNow. Their certificates remain public for transparency.',
      updated_at: new Date().toISOString(),
      count: data.count || 0,
      source: data.source,
      quarantined: data.quarantined || [],
    });
  } catch (err) {
    console.error('Quarantine API error:', err);
    return res.status(500).json({ error: 'Failed to fetch quarantine list', message: err.message });
  }
}
