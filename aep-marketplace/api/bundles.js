/**
 * MarketNow — Dynamic Bundles API
 * =================================
 *
 * v2.0 — Concurrency fixes (4 julio 2026)
 *   - Usa skills-cache.mjs (no fetch de 30MB por request)
 *
 * GET /api/bundles
 */

import { getSkills } from '../lib/skills-cache.mjs';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'index, follow');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ===== FIX: cache en memoria =====
    const skills = await getSkills();

    const byCat = {};
    for (const s of skills) {
      const c = s.category || 'Unknown';
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(s);
    }

    const bundleDefs = [
      { id: 'web-intelligence-pack', name: 'Web Intelligence Pack', category: 'Data', count: 5, price: 5.99, original: 9.95, icon: '🕷️', desc: '5 complementary scrapers for comprehensive web data extraction.', includes: 'scraping, extraction, parsing, data normalization' },
      { id: 'finance-data-pack', name: 'Finance Data Pack', category: 'Finance', count: 5, price: 4.99, original: 14.95, icon: '💰', desc: 'Yahoo Finance + Alpha Vantage + Stripe + crypto data + financial analysis.', includes: 'market data, payment processing, financial analysis' },
      { id: 'agent-safety-pack', name: 'Agent Safety Pack', category: 'Agent Safety', count: 10, price: 7.99, original: 49.00, icon: '🛡️', desc: 'Preconfigured Agent Safety skills. Sentinel scoring, guardrails, prompt injection defense.', includes: 'prompt injection defense, output validation, runtime monitoring' },
      { id: 'devops-power-pack', name: 'DevOps Power Pack', category: 'DevOps', count: 10, price: 9.99, original: 49.00, icon: '🔄', desc: 'Complete DevOps toolkit: CI/CD, monitoring, deployment, rollback, scaling.', includes: 'CI/CD pipeline, deployment orchestration, monitoring' },
      { id: 'marketing-agent-pack', name: 'Marketing Agent Pack', category: 'Marketing', count: 8, price: 6.99, original: 39.00, icon: '📣', desc: 'SEO, content generation, social media, email sequences, analytics.', includes: 'SEO, content gen, social scheduling, email automation' },
      { id: 'researcher-pack', name: 'Researcher Pack', category: 'Research', count: 6, price: 5.99, original: 29.00, icon: '🔬', desc: 'Academic search, citation extraction, data collection, summarization.', includes: 'academic search, citation management, data collection' },
    ];

    const bundles = bundleDefs.map(def => {
      let candidates = byCat[def.category] || [];
      candidates = [...candidates].sort((a, b) => (b.sentinel_score || 0) - (a.sentinel_score || 0));
      candidates = candidates.slice(0, def.count);

      return {
        id: def.id,
        name: def.name,
        description: def.desc,
        bundle_price: def.price,
        original_price: def.original,
        savings: Math.round((1 - def.price / def.original) * 100),
        category: def.category,
        icon: def.icon,
        skills_count: candidates.length,
        includes: def.includes,
        skill_ids: candidates.map(s => s.id),
        skill_names: candidates.map(s => s.name),
        skill_details: candidates.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          sentinel_score: s.sentinel_score || 6,
          slug: s.slug,
        })),
      };
    });

    return res.status(200).json({
      bundles,
      meta: {
        total_bundles: bundles.length,
        avg_savings: Math.round(bundles.reduce((sum, b) => sum + b.savings, 0) / bundles.length),
        currency: 'USD',
        model: 'one-time per bundle',
      },
    });
  } catch (err) {
    console.error('Bundles error:', err);
    return res.status(500).json({ error: 'Failed to compute bundles' });
  }
}
