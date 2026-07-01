/**
 * MarketNow — Dynamic Categories API
 * GET /api/categories
 * 
 * Serverless function that ALWAYS returns fresh data.
 * Cannot be cached by CDN.
 */

export default async function handler(req, res) {
  // Aggressive no-cache headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('X-Robots-Tag', 'index, follow');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fetch the skills data from the static file
    const baseUrl = `https://${req.headers.host}`;
    const skillsRes = await fetch(`${baseUrl}/api/skills.json`);
    if (!skillsRes.ok) throw new Error('Failed to fetch skills');
    const skills = await skillsRes.json();

    // Compute categories dynamically
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
        // Flag categories that look like bulk imports (exactly 30 items is
        // the signature of bulk-imported from community "awesome-mcp" lists).
        // We disclose this rather than hide it — see /catalog.
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
