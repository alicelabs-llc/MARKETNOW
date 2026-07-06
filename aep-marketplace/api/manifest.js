/**
 * MarketNow — Dynamic Manifest API + Health endpoint
 * ====================================================
 *
 * v2.0 — Concurrency fixes (4 julio 2026)
 *   - Usa skills-cache.mjs (no fetch de 30MB por request)
 *   - Agrega sub-endpoint /api/manifest?health=true para stats de caches
 *     (evita crear una función nueva y exceder el límite de 12 en Vercel Hobby)
 *
 * GET /api/manifest         → manifest del API
 * GET /api/manifest?health  → stats de caches y rate limiter
 */

import { getSkills } from '../lib/skills-cache.mjs';
import * as skillsCache from '../lib/skills-cache.mjs';
import * as rateLimit from '../lib/rate-limit.mjs';
import * as mandateCache from '../lib/mandate-cache.mjs';
import * as txCache from '../lib/tx-cache.mjs';
import * as baseRpc from '../lib/base-rpc-pool.mjs';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'https://marketnow.site');
  res.setHeader('X-Robots-Tag', 'index, follow');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ===== Sub-endpoint: /api/manifest?health =====
  if ('health' in req.query) {
    return res.status(200).json({
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
        base_rpc_strategy: 'round-robin 4 endpoints with 60s bad-list',
      },
    });
  }

  try {
    const skills = await getSkills();

    const cats = new Set();
    let minPrice = Infinity, maxPrice = 0, sumPrice = 0;
    for (const s of skills) {
      cats.add(s.category || 'Unknown');
      const p = s.price || 0;
      if (p < minPrice) minPrice = p;
      if (p > maxPrice) maxPrice = p;
      sumPrice += p;
    }

    return res.status(200).json({
      name: "MarketNow Skills API",
      version: "4.0.0",
      description: `Open marketplace for MCP-compatible agent skills. ${skills.length} verified skills with capabilities, system prompts, and multi-language support.`,
      base_url: "https://marketnow.site/api",
      total_skills: skills.length,
      categories_count: cats.size,
      pricing: {
        model: "one-time per skill",
        currency: "USD",
        min: minPrice,
        max: maxPrice,
        average: parseFloat((sumPrice / skills.length).toFixed(2)),
        no_subscriptions: true,
        no_credits: true,
      },
      commission_rate: 0.20,
      endpoints: {
        all_skills: "/api/skills.json",
        skills_lite: "/api/skills-lite.json",
        search: "/api/search",
        categories: "/api/categories",
        manifest: "/api/manifest",
        health: "/api/manifest?health",
        agent_instructions: "/api/agent.json",
        verify_purchase: "/api/verify-purchase",
        bundles: "/api/bundles.json",
        capability_schema: "/api/capability-schema.json",
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Manifest error:', err);
    return res.status(500).json({ error: 'Failed to compute manifest' });
  }
}
