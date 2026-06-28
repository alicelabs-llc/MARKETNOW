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

console.log(`✅ MarketNow — ${skills.length} skills reales escritas`);
console.log(`   → src/data/all_skills.json`);
console.log(`   → public/api/skills.json       (accesible para agentes)`);
console.log(`   → public/api/categories.json   (${categoryIndex.length} categorías)`);
console.log(`   → public/api/manifest.json`);
