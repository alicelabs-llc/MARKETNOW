// MarketNow — Skill Recommendation API
// ====================================
// POST /api/recommend
// Body: { "current_tools": ["filesystem", "web-search"], "agent_type": "coding" }
// Returns: { "recommended": [...] }

import { secureLight } from '../lib/secure.mjs';

const SKILLS_API = 'https://marketnow.site/api/skills.json';

// Cache skills (5 min TTL)
let skillsCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getSkills() {
  const now = Date.now();
  if (skillsCache && now - cacheTime < CACHE_TTL) return skillsCache;
  try {
    const res = await fetch(SKILLS_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    skillsCache = await res.json();
    cacheTime = now;
    return skillsCache;
  } catch (e) {
    return [];
  }
}

// Recommendation rules by agent type
const RECOMMENDATIONS = {
  coding: {
    keywords: ['github', 'git', 'terminal', 'shell', 'code', 'debug', 'lint', 'test'],
    categories: ['Developer Tools'],
    must_have: ['filesystem'],
  },
  research: {
    keywords: ['search', 'web', 'scraper', 'browse', 'fetch', 'url'],
    categories: ['Search', 'Web/API'],
    must_have: ['web-search'],
  },
  data: {
    keywords: ['database', 'sql', 'postgres', 'mysql', 'redis', 'data', 'etl'],
    categories: ['Data'],
    must_have: [],
  },
  finance: {
    keywords: ['payment', 'stripe', 'crypto', 'usdc', 'wallet', 'trading'],
    categories: ['Finance'],
    must_have: [],
  },
  communication: {
    keywords: ['slack', 'discord', 'email', 'message', 'chat', 'notify'],
    categories: ['Communication'],
    must_have: [],
  },
  security: {
    keywords: ['security', 'audit', 'scan', 'vulnerability', 'auth', 'pentest'],
    categories: ['Security'],
    must_have: [],
  },
};

export default secureLight(async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return API docs
    res.status(200).json({
      endpoint: '/api/recommend',
      method: 'POST',
      description: 'Get skill recommendations based on your agent\'s current tools',
      example: {
        request: {
          current_tools: ['filesystem', 'web-search'],
          agent_type: 'coding',
          max_price: 5,
        },
        response: {
          recommended: [
            { id: 'mn-gen-00015', name: 'GitHub MCP', reason: 'Complements filesystem for code management' },
          ],
        },
      },
      agent_types: Object.keys(RECOMMENDATIONS),
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const { current_tools = [], agent_type = 'coding', max_price, limit = 10 } = req.body;

  // Validate
  if (!Array.isArray(current_tools)) {
    res.status(400).json({ error: 'current_tools must be an array' });
    return;
  }

  const rules = RECOMMENDATIONS[agent_type] || RECOMMENDATIONS.coding;
  const skills = await getSkills();

  // Score each skill
  const scored = skills
    .filter(s => {
      // Exclude already-installed tools
      const name = (s.name || '').toLowerCase();
      const id = (s.id || '').toLowerCase();
      return !current_tools.some(t => 
        name.includes(t.toLowerCase()) || id.includes(t.toLowerCase())
      );
    })
    .filter(s => {
      // Filter by max_price if specified
      if (max_price !== undefined && s.price > max_price) return false;
      return true;
    })
    .map(s => {
      let score = 0;
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const tags = (s.tags || []).map(t => t.toLowerCase());
      const cat = (s.category || '').toLowerCase();

      // Score by keywords
      rules.keywords.forEach(kw => {
        if (name.includes(kw)) score += 3;
        if (desc.includes(kw)) score += 2;
        if (tags.some(t => t.includes(kw))) score += 2;
      });

      // Score by category
      rules.categories.forEach(c => {
        if (cat === c.toLowerCase()) score += 5;
      });

      // Prefer free skills
      if (s.price === 0) score += 1;

      // Prefer higher sentinel scores
      if (s.sentinel_score >= 8) score += 2;
      if (s.sentinel_score >= 10) score += 1;

      // Prefer auto-scanned (reviewed) skills
      if (s.review_status === 'human-reviewed') score += 3;

      return { skill: s, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Generate reasons
  const recommended = scored.map(item => {
    const s = item.skill;
    const reasons = [];
    
    if (s.category && rules.categories.includes(s.category)) {
      reasons.push(`Top category for ${agent_type} agents`);
    }
    if (s.price === 0) reasons.push('Free — no payment needed');
    if (s.sentinel_score >= 10) reasons.push('Perfect security score (10/10)');
    if (s.sentinel_score >= 8) reasons.push(`High security score (${s.sentinel_score}/10)`);
    if (s.review_status === 'human-reviewed') reasons.push('Human-reviewed');
    
    return {
      id: s.id,
      name: s.name,
      description: (s.description || '').slice(0, 150),
      price: s.price,
      sentinel_score: s.sentinel_score,
      risk_level: s.risk_level,
      category: s.category,
      install: s.install,
      reason: reasons.join('; ') || `Recommended for ${agent_type} agents`,
      score: item.score,
    };
  });

  res.status(200).json({
    agent_type,
    current_tools,
    recommended,
    total: recommended.length,
    timestamp: new Date().toISOString(),
  });
});
