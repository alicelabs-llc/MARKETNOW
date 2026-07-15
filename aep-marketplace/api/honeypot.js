/**
 * MarketNow — Honeypot Transparency Endpoint
 * ===========================================
 *
 * GET /api/honeypot
 *   Returns honeypot hit log + stats (public — for transparency).
 *
 * GET /api/honeypot?stats=1
 *   Returns only the stats summary.
 */

import { setCorsHeaders } from '../lib/cors.mjs';
import { getHoneypotLog, getHoneypotStats } from '../lib/honeypot.mjs';
import { applySecurityHeaders } from '../lib/waf.mjs';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  setCorsHeaders(req, res);
  applySecurityHeaders(res);
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const stats = getHoneypotStats();
    if (req.query.stats) {
      return res.status(200).json({
        endpoint: '/api/honeypot?stats=1',
        ...stats,
        updated_at: new Date().toISOString(),
      });
    }

    const log = getHoneypotLog(parseInt(req.query.limit || '50', 10));
    return res.status(200).json({
      endpoint: '/api/honeypot',
      description: 'Honeypot hit log — IPs that probed fake vulnerable paths (/admin, /.env, /wp-admin, /.git, etc.) and were auto-banned for 24 hours.',
      policy: 'Any access to a honeypot path triggers an automatic 24-hour IP ban. Logs are public for transparency.',
      stats,
      hits: log,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Honeypot API error:', err);
    return res.status(500).json({ error: 'honeypot_failed', message: err.message });
  }
}
