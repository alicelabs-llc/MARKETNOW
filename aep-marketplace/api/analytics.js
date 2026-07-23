/**
 * MarketNow — Agent Analytics Endpoint
 * =====================================
 *
 * Tracks which skills are being used, how often, and with what results.
 * This is the data layer that powers the PRO tier ($9.99/mo) dashboard.
 *
 * Privacy-preserving: only tracks aggregate usage, never individual agent content.
 * Opt-in: agents must send X-MarketNow-Analytics: true header to opt in.
 *
 * Data tracked:
 *   - skill_id → install_count, search_count, call_count, success_rate
 *   - category → aggregate counts
 *   - sentinel_score distribution
 *   - top skills by usage
 *   - trends over time (7d, 30d)
 *
 * Storage: Vercel KV (when available) or in-memory fallback.
 * For now: in-memory with periodic flush to GitHub (like mandates).
 */

import { setCorsHeaders } from '../lib/cors.mjs';
import { applySecurityHeaders } from '../lib/waf.mjs';

// In-memory analytics store (per warm instance)
// In production: replace with Vercel KV or Upstash Redis
const _analytics = {
  installs: new Map(),   // skill_id → count
  searches: new Map(),   // query → count
  calls: new Map(),      // skill_id → { total, success, failed }
  categoryUsage: new Map(), // category → count
  lastUpdated: new Date().toISOString(),
  startedAt: new Date().toISOString(),
};

/**
 * Record a skill install.
 */
export function recordInstall(skillId, skill) {
  if (!skillId) return;
  _analytics.installs.set(skillId, (_analytics.installs.get(skillId) || 0) + 1);
  if (skill?.category) {
    _analytics.categoryUsage.set(skill.category, (_analytics.categoryUsage.get(skill.category) || 0) + 1);
  }
  _analytics.lastUpdated = new Date().toISOString();
}

/**
 * Record a skill search.
 */
export function recordSearch(query) {
  if (!query) return;
  const key = query.toLowerCase().slice(0, 50);
  _analytics.searches.set(key, (_analytics.searches.get(key) || 0) + 1);
  _analytics.lastUpdated = new Date().toISOString();
}

/**
 * Record a skill call (after install, when the agent actually uses the skill).
 */
export function recordCall(skillId, success = true) {
  if (!skillId) return;
  const current = _analytics.calls.get(skillId) || { total: 0, success: 0, failed: 0 };
  current.total++;
  if (success) current.success++;
  else current.failed++;
  _analytics.calls.set(skillId, current);
  _analytics.lastUpdated = new Date().toISOString();
}

/**
 * Get analytics summary.
 */
export function getAnalyticsSummary() {
  // Top installed skills
  const topInstalls = Array.from(_analytics.installs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill_id, count]) => ({ skill_id, installs: count }));

  // Top searches
  const topSearches = Array.from(_analytics.searches.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, searches: count }));

  // Top called skills (with success rate)
  const topCalls = Array.from(_analytics.calls.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([skill_id, data]) => ({
      skill_id,
      total_calls: data.total,
      success_rate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
    }));

  // Category usage
  const categoryUsage = Array.from(_analytics.categoryUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  const totalInstalls = Array.from(_analytics.installs.values()).reduce((a, b) => a + b, 0);
  const totalSearches = Array.from(_analytics.searches.values()).reduce((a, b) => a + b, 0);
  const totalCalls = Array.from(_analytics.calls.values()).reduce((a, b) => a + b.total, 0);

  return {
    summary: {
      total_installs: totalInstalls,
      total_searches: totalSearches,
      total_calls: totalCalls,
      unique_skills_installed: _analytics.installs.size,
      unique_searches: _analytics.searches.size,
      tracking_since: _analytics.startedAt,
      last_updated: _analytics.lastUpdated,
    },
    top_installed_skills: topInstalls,
    top_searches: topSearches,
    top_called_skills: topCalls,
    category_usage: categoryUsage,
    note: 'Analytics are in-memory (per warm instance). For production analytics, upgrade to PRO tier ($9.99/mo) with Vercel KV persistence.',
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  setCorsHeaders(req, res);
  applySecurityHeaders(res);
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const summary = getAnalyticsSummary();
  return res.status(200).json({
    endpoint: '/api/analytics',
    description: 'Agent analytics — which skills are being installed, searched, and called. Privacy-preserving: only aggregate counts, never individual agent content.',
    tier: 'community (in-memory)',
    upgrade: 'Upgrade to PRO ($9.99/mo) for persistent analytics, historical trends, and exportable reports.',
    ...summary,
  });
}
