import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * MarketNow — Agent Quickstart
 *
 * Esta página está pensada para agentes y desarrolladores que quieren
 * consumir el marketplace programáticamente. Muestra los endpoints,
 * ejemplos en curl/Python/JavaScript, y el schema de respuesta.
 */
export default function Handshake() {
  const [copied, setCopied] = useState('');

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/skills.json',
      desc: 'List all 5,054 skills with prices, categories, install commands',
      size: '~7 MB',
    },
    {
      method: 'GET',
      path: '/api/categories.json',
      desc: 'List all 25 categories with skill counts',
      size: '~2 KB',
    },
    {
      method: 'GET',
      path: '/api/manifest.json',
      desc: 'API metadata, total skill count, version',
      size: '~1 KB',
    },
    {
      method: 'GET',
      path: '/api/agent.json',
      desc: 'Machine-readable agent instructions, schema, workflow',
      size: '~3 KB',
    },
  ];

  const examples = [
    {
      label: 'curl',
      title: 'Shell (curl + jq)',
      code: `# List all skills
curl https://marketnow.site/api/skills.json | jq '.[0:3]'

# Find skills under $1
curl https://marketnow.site/api/skills.json | \\
  jq '[.[] | select(.price < 1)] | .[0:5]'

# Find MCP servers in a specific category
curl https://marketnow.site/api/skills.json | \\
  jq '[.[] | select(.category == "AI/ML")]'

# Get API manifest
curl https://marketnow.site/api/manifest.json`,
    },
    {
      label: 'python',
      title: 'Python (requests)',
      code: [
        'import requests',
        '',
        '# Fetch all skills',
        "r = requests.get('https://marketnow.site/api/skills.json')",
        'skills = r.json()',
        "print(f'Total skills: {len(skills)}')",
        '',
        '# Find cheap AI/ML skills',
        'cheap_ai = [s for s in skills',
        "            if s['category'] == 'AI/ML' and s['price'] < 2]",
        'for s in cheap_ai[:5]:',
        "    print(f\"  ${s['price']:.2f}  {s['name']}\")",
        '',
        '# Install a skill',
        'import subprocess',
        'subprocess.run(',
        "    ['npx', '-y', '@marketnow/install', skills[0]['slug']],",
        '    check=True',
        ')',
      ].join('\n'),
    },
    {
      label: 'node',
      title: 'JavaScript (fetch)',
      code: [
        '// Fetch all skills',
        "const res = await fetch('https://marketnow.site/api/skills.json');",
        'const skills = await res.json();',
        'console.log(`Total skills: ${skills.length}`);',
        '',
        '// Find skills by tag',
        "const mcpSkills = skills.filter(s => s.tags?.includes('mcp'));",
        'console.log(`MCP-tagged: ${mcpSkills.length}`);',
        '',
        '// Find cheapest skills',
        'const cheapest = [...skills]',
        '  .sort((a, b) => a.price - b.price)',
        '  .slice(0, 10);',
        'cheapest.forEach(s => {',
        '  console.log(`  $${s.price.toFixed(2)}  ${s.name}`);',
        '});',
      ].join('\n'),
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            AGENT <span className="text-[#00F299]">QUICKSTART</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Everything an autonomous agent needs to discover, evaluate, and install
            skills from MarketNow. All endpoints are public, JSON-formatted, and
            CORS-enabled. No API key required for reads.
          </p>
        </motion.div>

        {/* Endpoints */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-4">PUBLIC ENDPOINTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {endpoints.map((ep) => (
              <button
                key={ep.path}
                onClick={() => copy(`curl https://marketnow.site${ep.path}`, `endpoint-${ep.path}`)}
                className="text-left p-4 rounded-xl bg-white/5 border border-white/5 hover:border-[#00F299]/30 hover:bg-[#00F299]/5 transition-all group"
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono font-bold">
                    {ep.method}
                  </span>
                  <code className="text-white text-sm font-mono">{ep.path}</code>
                  <span className="ml-auto text-[10px] text-zinc-500 font-mono">{ep.size}</span>
                </div>
                <p className="text-zinc-500 text-xs">{ep.desc}</p>
                <p className="text-[10px] text-[#00F299] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {copied === `endpoint-${ep.path}` ? '✓ COPIED' : '📋 Click to copy curl'}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Code examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-4">CODE EXAMPLES</h2>
          <div className="space-y-4">
            {examples.map((ex) => (
              <div key={ex.label} className="premium-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">{ex.title}</h3>
                  <button
                    onClick={() => copy(ex.code, `example-${ex.label}`)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-[#00F299]/10 text-xs font-mono text-zinc-400 hover:text-[#00F299] transition-all border border-white/5 hover:border-[#00F299]/30"
                  >
                    {copied === `example-${ex.label}` ? '✓ COPIED' : '📋 COPY'}
                  </button>
                </div>
                <pre className="bg-black/60 border border-white/5 rounded-xl p-4 overflow-x-auto">
                  <code className="text-[#00F299] text-xs font-mono whitespace-pre">{ex.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Workflow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-4">AGENT WORKFLOW</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { step: '1', title: 'Discover', desc: 'GET /api/skills.json' },
              { step: '2', title: 'Filter', desc: 'By category, price, tags' },
              { step: '3', title: 'Evaluate', desc: 'Read description + score' },
              { step: '4', title: 'Purchase', desc: 'One-time $0.99-$9.99' },
              { step: '5', title: 'Install', desc: 'npx -y @marketnow/install <slug>' },
            ].map((s) => (
              <div key={s.step} className="premium-card p-4">
                <div className="text-[#00F299] font-mono text-xs mb-2">STEP {s.step}</div>
                <div className="text-white font-semibold mb-1 text-sm">{s.title}</div>
                <div className="text-zinc-400 text-xs font-mono">{s.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="premium-card p-8"
        >
          <h2 className="text-xl font-bold text-white mb-4">PRICING FOR AGENTS</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Every skill has a transparent, one-time price. No subscriptions,
            no credits, no recurring billing. Average price: <span className="text-[#00F299] font-mono">$2.50</span>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { price: '$0.99', label: 'Utility', desc: 'Single-function MCP servers' },
              { price: '$1.99', label: 'Standard', desc: 'One API or service' },
              { price: '$2.99', label: 'Multi-feature', desc: 'Common choice' },
              { price: '$4.99', label: 'Sophisticated', desc: 'Multi-endpoint tools' },
              { price: '$9.99', label: 'Enterprise', desc: 'Specialized / complex' },
            ].map((tier) => (
              <div key={tier.price} className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <div className="text-2xl font-bold text-[#00F299] font-mono mb-1">{tier.price}</div>
                <div className="text-white text-xs font-semibold mb-1">{tier.label}</div>
                <div className="text-zinc-500 text-[10px]">{tier.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
