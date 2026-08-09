/**
 * MarketNow — Search API
 * ========================
 * GET /api/search?q=<query>&category=<cat>&limit=<n>&language=<lang>&max_price=<n>
 *
 * Searches skills by name, description, tags, category.
 * Uses pre-built skills_index.json for fast lookups.
 */

import { setCorsHeaders } from '../lib/cors.mjs';

export default async function handler(req, res) {
  setCorsHeaders(res);

  // Parse query params (Vercel gives us req.query for GET)
  const url = new URL(req.url, 'https://marketnow.site');
  const q = (req.query?.q || url.searchParams.get('q') || '').toLowerCase().trim();
  const category = req.query?.category || url.searchParams.get('category') || '';
  const limit = Math.min(parseInt(req.query?.limit || url.searchParams.get('limit') || '20'), 100);
  const language = req.query?.language || url.searchParams.get('language') || '';
  const maxPrice = parseFloat(req.query?.max_price || url.searchParams.get('max_price') || '999');

  if (!q && !category) {
    return res.status(400).json({
      error: 'Missing query parameter',
      hint: 'Use ?q=<search_term> or ?category=<category>',
      examples: [
        '/api/search?q=discord',
        '/api/search?q=database&category=Data',
        '/api/search?category=Security&limit=10',
        '/api/search?q=scraper&language=python',
      ],
    });
  }

  try {
    // Load skills-lite.json (smaller, faster) or skills_index.json
    // Use skills_index.json which has name, description, category, tags
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://marketnow.site';

    const indexResp = await fetch(`${baseUrl}/api/skills_index.json`);
    if (!indexResp.ok) {
      throw new Error(`Index fetch failed: ${indexResp.status}`);
    }
    const skills = await indexResp.json();

    // Filter by query
    let results = skills.filter(skill => {
      // Category filter
      if (category && skill.category?.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      // Price filter
      if (skill.price && skill.price > maxPrice) {
        return false;
      }
      // Language filter
      if (language && skill.language && skill.language.toLowerCase() !== language.toLowerCase()) {
        return false;
      }
      // Query search (if q is provided)
      if (q) {
        const name = (skill.name || '').toLowerCase();
        const desc = (skill.description || '').toLowerCase();
        const slug = (skill.slug || '').toLowerCase();
        const tags = (skill.tags || []).join(' ').toLowerCase();
        const searchText = `${name} ${desc} ${slug} ${tags}`;
        if (!searchText.includes(q)) {
          return false;
        }
      }
      return true;
    });

    // Relevance scoring
    if (q) {
      results = results.map(skill => {
        let score = 0;
        const name = (skill.name || '').toLowerCase();
        const desc = (skill.description || '').toLowerCase();
        const tags = (skill.tags || []).join(' ').toLowerCase();

        if (name === q) score += 100;
        else if (name.startsWith(q)) score += 50;
        else if (name.includes(q)) score += 30;
        if (desc.includes(q)) score += 10;
        if (tags.includes(q)) score += 15;
        // Sentinel score bonus
        score += (skill.sentinel_score || 0) * 2;

        return { ...skill, _relevance: score };
      });
      results.sort((a, b) => b._relevance - a._relevance);
    }

    // Limit results
    const total = results.length;
    results = results.slice(0, limit);

    // Clean up _relevance field
    results = results.map(({ _relevance, ...skill }) => skill);

    res.status(200).json({
      query: q || '*',
      category: category || null,
      total,
      returned: results.length,
      limit,
      results,
    });
  } catch (err) {
    console.error('[search] Error:', err.message);
    res.status(500).json({
      error: 'Search failed',
      detail: err.message,
    });
  }
}
