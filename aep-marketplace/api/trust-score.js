// MarketNow — Trust Score API
// GET /api/trust-score?skillId=mn-mcp-filesystem
// Returns a compact trust score that agents can use to decide whether to install

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

  const { skillId } = req.query;
  
  if (!skillId) {
    return res.status(400).json({
      error: 'skillId required',
      example: '/api/trust-score?skillId=mn-mcp-filesystem'
    });
  }

  // Try to find the skill in our catalog
  try {
    const skillsRes = await fetch('https://marketnow.site/api/skills-lite.json');
    const skills = await skillsRes.json();
    const skill = skills.find(s => s.id === skillId || s.slug === skillId);
    
    if (!skill) {
      return res.status(404).json({
        skillId,
        trust_score: null,
        recommendation: 'unknown',
        reason: 'Skill not found in MarketNow catalog. No audit data available.',
        verify_url: `https://marketnow.site/verify?skillId=${skillId}`
      });
    }

    const score = skill.sentinel_score || 0;
    const risk = skill.risk_level || 'unknown';
    
    // Agent-friendly recommendation
    let recommendation;
    if (score >= 8) recommendation = 'safe_to_install';
    else if (score >= 5) recommendation = 'install_with_caution';
    else if (score >= 2) recommendation = 'high_risk_review_before_install';
    else recommendation = score === 0 && skill.review_status === 'not_scanned' ? 'not_audited' : 'do_not_install';

    return res.status(200).json({
      skill_id: skill.id,
      name: skill.name,
      trust_score: score,
      max_score: 10,
      risk_level: risk,
      recommendation,
      review_status: skill.review_status,
      install_command: skill.install,
      price: skill.price,
      currency: skill.currency || 'USD',
      certificate_url: `https://marketnow.site/api/audit-skill?certificate=1&skillId=${skill.id}`,
      verify_url: `https://marketnow.site/verify?skillId=${skill.id}`,
      audit_layers: {
        l15: skill.review_status !== 'not_scanned',
        l16: skill.review_status !== 'not_scanned',
        l2: score > 0,
        l25: false, // Would need to check L2 results
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch skill data', detail: e.message });
  }
}
