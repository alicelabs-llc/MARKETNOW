/**
 * MarketNow — Health & Cache Stats Endpoint
 * ===========================================
 *
 * Endpoint: GET /api/health
 *
 * Returns real-time stats about:
 *   - Skills cache (size, source, TTL)
 *   - Rate limiter state (unique IPs, requests in window)
 *   - Mandate cache (size, TTL)
 *   - txHash cache (size, TTL)
 *   - Base RPC pool (which endpoints are healthy)
 *
 * Útil para monitorear concurrencia y detectar cuellos de botella.
 */

import * as skillsCache from '../lib/skills-cache.mjs';
import * as rateLimit from '../lib/rate-limit.mjs';
import * as mandateCache from '../lib/mandate-cache.mjs';
import * as txCache from '../lib/tx-cache.mjs';
import * as baseRpc from '../lib/base-rpc-pool.mjs';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const stats = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime ? Math.round(process.uptime()) : null,
    memory: process.memoryUsage ? {
      rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    } : null,
    caches: {
      skills: skillsCache.getStats(),
      rate_limiter: rateLimit.getStats(),
      mandates: mandateCache.getStats(),
      tx_verification: txCache.getStats(),
      base_rpc_pool: baseRpc.getStats(),
    },
    limits: {
      skills_cache_ttl: '5 minutes',
      mandate_cache_ttl: '30 seconds',
      tx_cache_ttl: '5 minutes',
      rate_limit_window: '60 seconds',
      rate_limit_tiers: rateLimit.TIERS,
    },
    concurrency_estimates: {
      max_users_hobby_plan: '500 concurrent (with caches)',
      github_api_calls_per_hour: 5000,
      github_api_consumption_per_list: 'N+1 calls (N = number of mandates)',
      base_rpc_strategy: 'round-robin 4 endpoints with 60s bad-list',
    },
  };

  return res.status(200).json(stats);
}
