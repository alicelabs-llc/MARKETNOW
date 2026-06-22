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

// ─── Generación ───────────────────────────────────────────────────────────
const TARGET = 13000;
const skills = [];

for (let i = 0; i < TARGET; i++) {
  const action   = pick(actions);
  const subject  = pick(subjects);
  const cat      = pick(categories);
  const prov     = pick(providers);
  const price    = pick(pricePoints);
  const rating   = randFloat(3.8, 5.0);
  const trust    = randInt(80, 100);
  const execs    = randInt(10, 900) + 'K';
  const roi      = randFloat(1.5, 12.0) + 'x';
  const latency  = randInt(10, 2500) + 'ms';
  const success  = randFloat(92.0, 100.0);
  const idx      = String(i).padStart(5, '0');
  const id       = `mn-${cat.toLowerCase().substring(0, 3)}-${idx}`;

  skills.push({
    id,
    name:       `${subject} ${action} Pro`,
    tagline:    `Autonomous ${subject.toLowerCase()} ${action.toLowerCase()} node for ${prov.replace(/_/g, ' ')}.`,
    description:`High-performance MCP server providing ${action.toLowerCase()} capabilities for ${subject.toLowerCase()} data. Optimized for autonomous agents requiring ${trust}% trust and low latency (${latency}). Verified by MarketNow Sentinel.`,
    category:   cat,
    provider:   prov,
    price,
    rating,
    executions: execs,
    roi,
    latency,
    successRate: success,
    trustScore:  trust,
    verified:    rand() > 0.1,
    tags:        [cat.toLowerCase(), action.toLowerCase(), subject.split(' ')[0].toLowerCase()],
    doc: {
      setup:   `1. Install via MCP CLI: \`npx -y @marketnow-registry/${id}\`\n2. Add to your MCP config\n3. Restart agent cluster.`,
      usage:   `agent.call("${id}", { target: "input_data", precision: "high" })`,
      mcpConfig: {
        mcpServers: {
          [id]: {
            command:   "npx",
            args:      ["-y", `@marketnow-registry/${id}`],
            env:       { [`${id.toUpperCase().replace(/-/g, '_')}_API_KEY`]: "REQUIRED" },
            transport: "stdio"
          }
        }
      },
      requirements: ['Node.js 20+', 'MarketNow License Key'],
      benchmarks: {
        peak_tps:   randInt(500, 5000),
        avg_memory: randInt(64, 512) + 'MB',
        cold_start: randInt(50, 800) + 'ms'
      }
    }
  });
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
