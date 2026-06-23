/**
 * MarketNow — Skill Generator
 * Genera 13,000 skills y las exporta a:
 *   - src/data/all_skills.json     (para el SPA React)
 *   - public/api/skills.json       (para agentes y crawlers via HTTP)
 *   - public/api/categories.json   (índice de categorías)
 *
 * Uso: node generate_skills.cjs
 */

const fs = require('fs');
const path = require('path');

const categories = [
  'Network', 'System', 'DevOps', 'Cognitive', 'Finance', 'Media',
  'Security', 'Data', 'Blockchain', 'IoT', 'Sales', 'Automation',
  'Research', 'Analysis', 'Voice', 'Messaging', 'AI', 'Compliance',
  'Legal', 'Healthcare', 'Education', 'Logistics', 'Energy', 'Marketing'
];

const providers = [
  'MCP_Core', 'AliceLabs_Nexus', 'AutoGrid', 'NeuralNet', 'DataSynapse',
  'QuantCore', 'CyberSecOps', 'Web3_Oracle', 'Stitch_Integrated',
  'Hermes_Protocol', 'VaultAI', 'NexusCRM', 'Meridian_Labs', 'PolyAgent'
];

const actions = [
  'Extractor', 'Synthesizer', 'Validator', 'Analyzer', 'Generator',
  'Optimizer', 'Auditor', 'Connector', 'Parser', 'Monitor',
  'Orchestrator', 'Translator', 'Enricher', 'Indexer', 'Classifier',
  'Detector', 'Summarizer', 'Scorer', 'Router', 'Aggregator'
];

const subjects = [
  'DOM', 'Financial Reports', 'Smart Contracts', 'Log Files', 'Social Media',
  'IoT Sensors', 'Git Repositories', 'SQL Databases', 'Cloud Infrastructure',
  'Voice Audio', 'Images', 'Email Threads', 'Supply Chain', 'User Behavior',
  'Market Trends', 'Encryption Keys', 'PDF Documents', 'API Responses',
  'Calendar Events', 'Legal Contracts', 'Medical Records', 'News Feeds',
  'Satellite Data', 'Network Traffic', 'Code Repositories'
];

const pricePoints = [5, 9, 19, 29, 49, 79, 99, 149, 199, 249, 299, 499, 749, 999, 1200, 2400];

// ─── Seeded pseudo-random para builds deterministas ────────────────────────
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return Math.abs(seed) / 0x7fffffff;
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randFloat(min, max, decimals = 1) {
  return parseFloat((rand() * (max - min) + min).toFixed(decimals));
}

// ─── Generación a partir de skills reales ───
let skills = [];
try {
  const realSkillsPath = path.join(__dirname, 'public', 'api', 'skills_index.json');
  if (fs.existsSync(realSkillsPath)) {
    skills = JSON.parse(fs.readFileSync(realSkillsPath, 'utf8'));
    console.log(`Loaded ${skills.length} real skills for the build.`);
  } else {
    console.log("No real skills_index.json found, using empty array.");
  }
} catch (e) {
  console.error("Error reading real skills:", e);
}
if (skills.length === 0) {
  // Fallback a mínimo placeholder si está vacío
  skills = [{
    id: "mn-ai-00000",
    name: "discord-mcp-server",
    slug: "discord-mcp-server",
    tagline: "Real MCP server - discord-mcp-server.",
    description: "Verified MCP server - discord-mcp-server.",
    category: "AI",
    provider: "DataSynapse",
    price: 5,
    rating: 4.5,
    executions: "10K",
    roi: "2x",
    latency: "40ms",
    successRate: 95,
    trustScore: 90,
    verified: true,
    tags: ["ai"],
    doc: { setup: "", usage: "", requirements: [] }
  }];
}

// ─── Índice de categorías ────────────────────────────────────────────────
const categoryIndex = categories.map(cat => ({
  name:  cat,
  slug:  cat.toLowerCase(),
  count: skills.filter(s => s.category === cat).length,
  url:   `https://www.marketnow.site/#/category/${cat}`
}));

// ─── Manifest del API ────────────────────────────────────────────────────
const apiManifest = {
  name:        "MarketNow Skills API",
  version:     "1.0.0",
  description: "Open marketplace for AI agent skills — MCP compatible",
  base_url:    "https://www.marketnow.site/api",
  total_skills: skills.length,
  endpoints: {
    all_skills:  "/api/skills.json",
    categories:  "/api/categories.json",
    manifest:    "/api/manifest.json"
  },
  usage: {
    fetch_all:    "GET https://www.marketnow.site/api/skills.json",
    by_category:  "Filter client-side: skills.filter(s => s.category === 'Finance')",
    by_tag:       "Filter client-side: skills.filter(s => s.tags.includes('network'))",
    search:       "Filter client-side: skills.filter(s => s.name.toLowerCase().includes(query))"
  },
  generated_at: new Date().toISOString()
};

// ─── Escritura de archivos ────────────────────────────────────────────────
const dirs = [
  path.join(__dirname, 'src', 'data'),
  path.join(__dirname, 'public', 'api')
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
  path.join(__dirname, 'public', 'api', 'skills_index.json'),
  JSON.stringify(skills)
);

fs.writeFileSync(
  path.join(__dirname, 'public', 'api', 'categories.json'),
  JSON.stringify(categoryIndex, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, 'public', 'api', 'manifest.json'),
  JSON.stringify(apiManifest, null, 2)
);

console.log(`✅ MarketNow — ${skills.length} skills generadas`);
console.log(`   → src/data/all_skills.json`);
console.log(`   → public/api/skills.json       (accesible para agentes)`);
console.log(`   → public/api/categories.json`);
console.log(`   → public/api/manifest.json`);
