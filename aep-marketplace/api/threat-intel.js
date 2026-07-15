/**
 * MarketNow — Threat Intelligence Endpoint
 * =========================================
 *
 * GET /api/threat-intel
 *   Returns current IOC feed summary (URLhaus + MalwareBazaar + ThreatFox).
 *   Public — for transparency.
 *
 * GET /api/threat-intel?url=https://example.com
 *   Checks if a URL is in URLhaus.
 *
 * GET /api/threat-intel?hash=sha256...
 *   Checks if a file hash is in MalwareBazaar.
 */

import { setCorsHeaders } from '../lib/cors.mjs';
import { getThreatIntelSummary, checkUrl, checkHash } from '../lib/threat-intel.mjs';
import { applySecurityHeaders } from '../lib/waf.mjs';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  setCorsHeaders(req, res);
  applySecurityHeaders(res);
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    // Sub-endpoint: URL check
    if (req.query.url) {
      const result = await checkUrl(req.query.url);
      return res.status(200).json({
        checked_url: req.query.url,
        ...result,
        checked_at: new Date().toISOString(),
      });
    }

    // Sub-endpoint: hash check
    if (req.query.hash) {
      const result = await checkHash(req.query.hash);
      return res.status(200).json({
        checked_hash: req.query.hash,
        ...result,
        checked_at: new Date().toISOString(),
      });
    }

    // Default: full summary
    const summary = await getThreatIntelSummary();
    return res.status(200).json({
      endpoint: '/api/threat-intel',
      description: 'Real-time threat intelligence from abuse.ch (URLhaus, MalwareBazaar, ThreatFox). IOCs are cached for 5 minutes.',
      ...summary,
      usage: {
        check_url: 'GET /api/threat-intel?url=https://example.com',
        check_hash: 'GET /api/threat-intel?hash=<sha256>',
        full_summary: 'GET /api/threat-intel',
      },
    });
  } catch (err) {
    console.error('Threat intel error:', err);
    return res.status(500).json({ error: 'threat_intel_failed', message: err.message });
  }
}
