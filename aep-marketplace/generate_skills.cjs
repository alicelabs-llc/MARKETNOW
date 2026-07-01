/**
 * MarketNow — Skill Index Builder
 * ===============================
 * Carga las skills reales desde public/api/skills_index.json (limpiadas)
 * y genera los archivos derivados que consumen el SPA y los agentes:
 *
 *   - src/data/all_skills.json     (para el SPA React)
 *   - public/api/skills.json       (para agentes y crawlers via HTTP)
 *   - public/api/categories.json   (índice de categorías con counts reales)
 *   - public/api/manifest.json     (manifest del API)
 *
 * Uso: node generate_skills.cjs
 *
 * NOTA: Este script NO genera skills sintéticas. Solo copia y enriquece
 *       las skills reales que ya existen en skills_index.json.
 *       Para regenerar el índice limpio, ejecuta: node ../../scripts/clean_skills_index.js
 */

const fs = require('fs');
const path = require('path');

// ─── Cargar skills reales ────────────────────────────────────────────────
let skills = [];
try {
  const realSkillsPath = path.join(__dirname, 'public', 'api', 'skills_index.json');
  if (fs.existsSync(realSkillsPath)) {
    skills = JSON.parse(fs.readFileSync(realSkillsPath, 'utf8'));
    console.log(`Loaded ${skills.length} real skills.`);
  } else {
    console.warn("⚠ skills_index.json not found. Run scripts/clean_skills_index.js first.");
  }
} catch (e) {
  console.error("Error reading skills_index.json:", e.message);
  process.exit(1);
}

if (skills.length === 0) {
  console.error("✗ No skills found. Aborting.");
  process.exit(1);
}

// ─── Índice de categorías con counts REALES ──────────────────────────────
const categoryMap = new Map();
for (const s of skills) {
  const cat = s.category || 'Developer Tools';
  if (!categoryMap.has(cat)) {
    categoryMap.set(cat, { name: cat, slug: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'), count: 0 });
  }
  categoryMap.get(cat).count++;
}
const categoryIndex = Array.from(categoryMap.values())
  .sort((a, b) => b.count - a.count)
  .map(c => ({
    ...c,
    url: `https://www.marketnow.site/registry?cat=${encodeURIComponent(c.slug)}`,
  }));

// ─── Manifest del API ────────────────────────────────────────────────────
const apiManifest = {
  name:        "MarketNow Skills API",
  version:     "2.0.0",
  description: "Open marketplace for AI agent skills — MCP compatible. Every skill has a real description from its source repository.",
  base_url:    "https://www.marketnow.site/api",
  total_skills: skills.length,
  categories_count: categoryIndex.length,
  endpoints: {
    all_skills:  "/api/skills.json",
    categories:  "/api/categories.json",
    manifest:    "/api/manifest.json",
    stats:       "/api/skills_stats.json",
  },
  usage: {
    fetch_all:    "GET https://www.marketnow.site/api/skills.json",
    by_category:  "Filter client-side: skills.filter(s => s.category === 'Finance')",
    by_tag:       "Filter client-side: skills.filter(s => s.tags.includes('mcp'))",
    search:       "Filter client-side: skills.filter(s => s.name.toLowerCase().includes(query))",
  },
  generated_at: new Date().toISOString(),
};

// ─── Escritura de archivos ────────────────────────────────────────────────
const dirs = [
  path.join(__dirname, 'src', 'data'),
  path.join(__dirname, 'public', 'api'),
];
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─── Enrich skills with trust fields (Claude review response) ────────────
// Load free-skill IDs (these get review_status = 'human-reviewed')
const freeIds = new Set();
const freeSkillsPath = path.join(__dirname, 'public', 'api', 'free-skills.json');
if (fs.existsSync(freeSkillsPath)) {
  try {
    const freeData = JSON.parse(fs.readFileSync(freeSkillsPath, 'utf8'));
    for (const s of (freeData.skills || [])) {
      if (s.id) freeIds.add(s.id);
    }
  } catch (e) { /* ignore */ }
}

const USDC_DISCLAIMER = 'USDC payments on Base are irreversible on-chain. For disputes (skill did not work as described, security issue, etc.), contact support@marketnow.site within 7 days with the txHash and skillId. AliceLabs will refund from treasury for verified disputes. See /trust for the full dispute policy.';

for (const s of skills) {
  // review_status (replaces universal 'verified: true')
  s.review_status = freeIds.has(s.id) ? 'human-reviewed' : 'auto-scanned';
  s.verified = s.review_status !== 'auto-scanned'; // legacy compat

  // permissions — declarative, inferred from metadata
  const setup = (s.doc && s.doc.setup) || {};
  const envVars = setup.required_env || [];
  const caps = s.capabilities || {};
  const network = [];
  const filesystem = [];
  let subprocess = false;
  for (const env of envVars) {
    const u = String(env).toUpperCase();
    if (/(URL|ENDPOINT|WEBHOOK|API|TOKEN|KEY)/.test(u)) network.push(env);
  }
  for (const k of Object.keys(caps)) {
    const u = k.toUpperCase();
    if (/(HTTP|FETCH|REQUEST|CALL|API|WEBHOOK)/.test(u)) network.push(k);
    if (/(FILE|READ|WRITE|SAVE|EXPORT)/.test(u)) filesystem.push(k);
    if (/(EXEC|SHELL|RUN|COMMAND)/.test(u)) subprocess = true;
  }
  const install = s.install || '';
  if (/npx|npm |curl|bash/.test(install)) subprocess = true;
  s.permissions = {
    network: [...new Set(network)].slice(0, 10),
    filesystem: [...new Set(filesystem)].slice(0, 10),
    env_vars: envVars.slice(0, 15),
    subprocess,
    disclosure: 'Declarative — inferred from skill metadata. Not enforced at runtime. See /trust for roadmap.',
  };

  // source
  if (s.id && s.id.startsWith('mn-prompt-')) {
    s.source = { type: 'curated', url: null, note: 'Hand-curated by AliceLabs — usually a system prompt, not a code package.' };
  } else if (s.id && s.id.startsWith('mn-gen-')) {
    s.source = { type: 'bulk-import', url: null, note: 'Imported from a community agent tool inventory. Sentinel-scanned, not individually curated.' };
  } else {
    s.source = { type: 'github', url: null, note: 'Sourced from a public GitHub MCP server repo (URL field to be populated).' };
  }

  s.usdc_disclaimer = USDC_DISCLAIMER;
}

// SPA data
fs.writeFileSync(
  path.join(__dirname, 'src', 'data', 'all_skills.json'),
  JSON.stringify(skills, null, 2)
);

// Public API — accesible por agentes via HTTP GET
fs.writeFileSync(
  path.join(__dirname, 'public', 'api', 'skills.json'),
  JSON.stringify(skills, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, 'public', 'api', 'categories.json'),
  JSON.stringify(categoryIndex, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, 'public', 'api', 'manifest.json'),
  JSON.stringify(apiManifest, null, 2)
);

// Copy agent.json (machine-readable instructions for autonomous agents) if it exists
const agentJsonPath = path.join(__dirname, 'public', 'api', 'agent.json');
if (fs.existsSync(agentJsonPath)) {
  // Update total_skills in agent.json to match current count
  const agentJson = JSON.parse(fs.readFileSync(agentJsonPath, 'utf8'));
  if (agentJson.pricing) {
    // Recompute average from current skills
    const prices = skills.map(s => s.price).filter(p => typeof p === 'number');
    if (prices.length > 0) {
      agentJson.pricing.average = parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
      agentJson.pricing.min = Math.min(...prices);
      agentJson.pricing.max = Math.max(...prices);
    }
  }
  agentJson.generated_at = new Date().toISOString();
  fs.writeFileSync(agentJsonPath, JSON.stringify(agentJson, null, 2));
  console.log(`   → public/api/agent.json       (machine-readable agent instructions)`);
}

console.log(`✅ MarketNow — ${skills.length} skills reales escritas`);
console.log(`   → src/data/all_skills.json`);
console.log(`   → public/api/skills.json       (accesible para agentes)`);
console.log(`   → public/api/categories.json   (${categoryIndex.length} categorías)`);
console.log(`   → public/api/manifest.json`);
