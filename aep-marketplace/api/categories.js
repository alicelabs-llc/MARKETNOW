/**
 * MarketNow — Dynamic Categories API
 * ===================================
 *
 * v2.0 — Concurrency fixes (4 julio 2026)
 *   - Usa skills-cache.mjs (no fetch de 30MB por request)
 *
 * GET /api/categories
 */

import { getSkills } from '../lib/skills-cache.mjs';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'https://marketnow.site');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('X-Robots-Tag', 'index, follow');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ===== FIX: cache en memoria =====
    const skills = await getSkills();

    const catMap = new Map();
    for (const s of skills) {
      const cat = s.category || 'Unknown';
      if (!catMap.has(cat)) {
        catMap.set(cat, { name: cat, slug: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'), count: 0 });
      }
      catMap.get(cat).count++;
    }

    const categories = Array.from(catMap.values())
      .sort((a, b) => b.count - a.count)
      .map(c => {
        const isBulkImported = c.count === 30;
        return {
          ...c,
          url: `https://marketnow.site/registry?cat=${encodeURIComponent(c.slug)}`,
          bulk_imported: isBulkImported,
          disclosure: isBulkImported
            ? 'This category contains exactly 30 items, indicating a bulk import from a community awesome-mcp list. Skills are Sentinel-scanned but not individually curated. See /catalog for full disclosure.'
            : null,
        };
      });

    return res.status(200).json(categories);
  } catch (err) {
    console.error('Categories error:', err);
    return res.status(500).json({ error: 'Failed to compute categories' });
  }
}
