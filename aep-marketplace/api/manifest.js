/**
 * MarketNow — Dynamic Manifest API
 * GET /api/manifest
 * 
 * Always returns fresh metadata. Cannot be cached.
 */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'index, follow');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const baseUrl = `https://${req.headers.host}`;
    const skillsRes = await fetch(`${baseUrl}/api/skills.json`);
    if (!skillsRes.ok) throw new Error('Failed to fetch skills');
    const skills = await skillsRes.json();

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
        search: "/api/search",
        categories: "/api/categories",
        manifest: "/api/manifest",
        agent_instructions: "/api/agent.json",
        verify_purchase: "/api/verify-purchase",
        bundles: "/api/bundles.json",
        openapi: "/api/openapi.yaml",
        capability_schema: "/api/capability-schema.json",
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Manifest error:', err);
    return res.status(500).json({ error: 'Failed to compute manifest' });
  }
}
