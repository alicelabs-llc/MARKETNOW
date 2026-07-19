// MarketNow — Skill Detail API
// GET /api/skills/{skillId} — returns full skill details
// Agents use this to get install commands, security scores, and system prompts

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Skill ID required' });
  }

  try {
    const skillsRes = await fetch('https://marketnow.site/api/skills-lite.json');
    const skills = await skillsRes.json();
    
    // Try exact ID match, then slug match
    const skill = skills.find(s => s.id === id) || 
                  skills.find(s => s.slug === id) ||
                  skills.find(s => s.id === id.toLowerCase());
    
    if (!skill) {
      return res.status(404).json({
        error: 'Skill not found',
        skillId: id,
        search_url: `https://marketnow.site/api/search?q=${encodeURIComponent(id)}`,
      });
    }

    // Return agent-optimized response (compact, no HTML)
    res.status(200).json({
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      category: skill.category,
      tags: skill.tags || [],
      
      // Install info (what agents need)
      install: skill.install,
      install_command: skill.install,
      
      // Security (what agents check)
      sentinel_score: skill.sentinel_score || 0,
      risk_level: skill.risk_level || 'unknown',
      review_status: skill.review_status || 'not_scanned',
      trust_score_url: `https://marketnow.site/api/trust-score?skillId=${skill.id}`,
      certificate_url: `https://marketnow.site/api/audit-skill?certificate=1&skillId=${skill.id}`,
      
      // Commerce
      price: skill.price || 0,
      currency: skill.currency || 'USD',
      payment: skill.price === 0 ? 'free' : 'usdc_base_or_stripe',
      
      // Meta
      author: skill.author,
      version: skill.version,
      license: skill.license,
      homepage: skill.source?.url || null,
      github: skill.source?.url || null,
      
      // Tools (if available)
      tools: skill.capabilities?.tools || [],
      
      // Links
      detail_url: `https://marketnow.site/skill/${skill.slug || skill.id}`,
      verify_url: `https://marketnow.site/verify?skillId=${skill.id}`,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch skill', detail: e.message });
  }
}
