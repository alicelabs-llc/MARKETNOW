/**
 * MarketNow — Server-side Skill Search
 * GET /api/search?q=scrape&category=Data&max_price=2.99&language=en&limit=20
 * 
 * Returns matching skills with relevance scores.
 */

export default async function handler(req, res) {
  // CORS + rate limit headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', '59');
  // CRITICAL: no-store prevents Vercel CDN from caching search results
  // Without this, different queries return the same cached result
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Vary', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { q = '', category = '', max_price = '', min_price = '', language = '', limit = '20', sort = 'relevance' } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 20, 100);

    // Fetch skills (cached by Vercel CDN)
    const skillsRes = await fetch(`https://${req.headers.host}/api/skills.json`);
    if (!skillsRes.ok) throw new Error('Failed to fetch skills');
    let skills = await skillsRes.json();

    // Filter by category
    if (category) {
      skills = skills.filter(s => s.category?.toLowerCase() === category.toLowerCase());
    }

    // Filter by price
    if (max_price) {
      const max = parseFloat(max_price);
      skills = skills.filter(s => s.price <= max);
    }
    if (min_price) {
      const min = parseFloat(min_price);
      skills = skills.filter(s => s.price >= min);
    }

    // Filter by language (skills that have that translation)
    if (language) {
      skills = skills.filter(s => s.translations && s.translations[language]);
    }

    // Search by query (with relevance scoring)
    let results;
    if (q) {
      const query = q.toLowerCase().trim();
      results = skills
        .map(s => {
          let score = 0;
          const name = (s.name || '').toLowerCase();
          const desc = (s.description || '').toLowerCase();
          const tags = (s.tags || []).join(' ').toLowerCase();
          
          if (name.includes(query)) score += 10;
          if (tags.includes(query)) score += 8;
          if (desc.includes(query)) score += 5;
          
          // Partial matches
          const queryWords = query.split(/\s+/);
          for (const word of queryWords) {
            if (name.includes(word)) score += 3;
            if (desc.includes(word)) score += 2;
            if (tags.includes(word)) score += 2;
          }
          
          // Capability matching
          if (s.capabilities) {
            const caps = JSON.stringify(s.capabilities).toLowerCase();
            if (caps.includes(query)) score += 6;
            for (const word of queryWords) {
              if (caps.includes(word)) score += 1;
            }
          }
          
          return { skill: s, score };
        })
        .filter(r => r.score > 0);
      
      // Sort by relevance
      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, maxLimit).map(r => ({
        ...r.skill,
        relevance_score: r.score,
      }));
    } else {
      // No query — just return filtered results
      results = skills.slice(0, maxLimit);
    }

    // Sort (if not relevance search)
    if (!q && sort !== 'relevance') {
      results.sort((a, b) => {
        if (sort === 'price') return a.price - b.price;
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'score') return (b.sentinel_score || 0) - (a.sentinel_score || 0);
        return 0;
      });
    }

    return res.status(200).json({
      total: q ? results.length : skills.length,
      returned: results.length,
      query: q || null,
      filters: { category, max_price, min_price, language },
      results,
    });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed', message: err.message });
  }
}
