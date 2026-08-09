/**
 * MarketNow — Search API
 * ========================
 * GET /api/search?q=<query>&category=<cat>&limit=<n>&language=<lang>&max_price=<n>
 *
 * Searches skills by name, description, tags, category.
 * Uses pre-built skills-lite.json for fast lookups.
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
    // Load skills-lite.json (smaller, faster) or skills-lite.json
    // Use skills-lite.json which has name, description, category, tags
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://marketnow.site';

    const indexResp = await fetch(`${baseUrl}/api/skills-lite.json`);
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

// ─── Also handle /api/recommend via POST ───
// This consolidates recommend.js into search.js to stay under 12 lambdas
export async function recommendHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  const { current_tools = [], agent_type = 'general' } = body;

  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://marketnow.site';
    const skillsResp = await fetch(`${baseUrl}/api/skills-lite.json`);
    const skills = await skillsResp.json();

    // Simple recommendation: skills that complement current_tools
    const toolNames = current_tools.map(t => t.toLowerCase());
    const recommended = skills
      .filter(s => !toolNames.includes((s.name || '').toLowerCase()))
      .filter(s => {
        if (agent_type === 'coding') return ['Developer Tools', 'AI/ML', 'Web/API'].includes(s.category);
        if (agent_type === 'data') return ['Data', 'Analytics', 'AI/ML'].includes(s.category);
        if (agent_type === 'security') return ['Security', 'Developer Tools'].includes(s.category);
        return true;
      })
      .sort((a, b) => (b.sentinel_score || 0) - (a.sentinel_score || 0))
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: (s.description || '').slice(0, 200),
        sentinel_score: s.sentinel_score || 0,
        risk_level: s.risk_level || 'unknown',
      }));

    res.status(200).json({ recommended, agent_type, based_on: current_tools });
  } catch (err) {
    res.status(500).json({ error: 'Recommendation failed', detail: err.message });
  }
}

// ─── Also handle /api/skills/{id} for skill detail ───
export async function skillDetailHandler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Skill ID required' });

  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://marketnow.site';
    const skillsResp = await fetch(`${baseUrl}/api/skills-lite.json`);
    const skills = await skillsResp.json();
    const skill = skills.find(s => s.id === id) || skills.find(s => s.slug === id);

    if (!skill) return res.status(404).json({ error: 'Skill not found', id });

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.status(200).json(skill);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skill', detail: err.message });
  }
}
