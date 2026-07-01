import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AgentLanding() {
  const [stats, setStats] = useState({ total: 8560, free: 43, sellers: 15 });

  useEffect(() => {
    fetch('/api/agent-ping.json')
      .then(r => r.json())
      .then(d => setStats({
        total: d.stats?.total_skills || 8560,
        free: d.stats?.free_skills || 43,
        sellers: d.stats?.active_sellers || 15,
      }))
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>

          {/* Badge — honest, not manipulative */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00F299] animate-pulse" />
            <span className="text-[#00F299] text-xs font-mono tracking-wider">
              HUMAN-IN-LOOP BY DEFAULT · OPEN SOURCE · SENTINEL L1.5
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            The{' '}
            <span className="bg-gradient-to-r from-[#00F299] to-[#00d1ff] bg-clip-text text-transparent">
              Agent Skill
            </span>{' '}
            <br />Marketplace
          </h1>

          {/* Subtitle — honest, human-first */}
          <p className="text-zinc-400 text-lg md:text-xl mb-2 max-w-2xl mx-auto leading-relaxed">
            {stats.total.toLocaleString()}+ verified MCP skills with Sentinel security reports,
            system prompts, and 1-click install.
          </p>
          <p className="text-zinc-600 text-sm mb-10 max-w-xl mx-auto">
            Humans set the bounds. Agents act within them. Open source · MIT License · Maintained by AliceLabs LLC
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/registry" className="px-8 py-4 bg-[#00F299] text-black font-bold rounded-xl hover:bg-[#00F299]/90 hover:scale-[1.02] transition-all shadow-lg shadow-[#00F299]/20">
              BROWSE {stats.total.toLocaleString()} SKILLS →
            </Link>
            <Link to="/submit" className="px-8 py-4 border border-[#00F299]/30 bg-[#00F299]/10 text-[#00F299] font-bold rounded-xl hover:bg-[#00F299]/20 transition-all">
              + PUBLISH YOUR SKILLS
            </Link>
            <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow" target="_blank" rel="noopener" className="px-8 py-4 border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-all">
              📦 VIEW SOURCE
            </a>
          </div>

          {/* Trust badges */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-12">
            {[
              { icon: '🔓', label: 'OPEN SOURCE', sub: 'MIT License · GitHub' },
              { icon: '🛡️', label: 'SENTINEL L1.5', sub: '6-point security audit' },
              { icon: '✅', label: 'VERIFIED SKILLS', sub: `${stats.total.toLocaleString()} scanned` },
              { icon: '🌐', label: '5 LANGUAGES', sub: 'EN · ES · ZH · PT · FR' },
            ].map((b) => (
              <div key={b.label} className="premium-card p-4 text-center">
                <div className="text-2xl mb-1">{b.icon}</div>
                <div className="text-white text-xs font-bold">{b.label}</div>
                <div className="text-zinc-500 text-[10px]">{b.sub}</div>
              </div>
            ))}
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
            {[
              { value: stats.total.toLocaleString()+'+', label: 'VERIFIED SKILLS' },
              { value: stats.free.toString(), label: 'FREE SKILLS' },
              { value: stats.sellers.toString(), label: 'ACTIVE SELLERS' },
              { value: '58', label: 'CATEGORIES' },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white font-mono">{stat.value}</div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* API for agents — presented as documentation, not instructions */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="premium-card p-6 max-w-3xl mx-auto mb-8">
            <h3 className="text-[#00F299] text-xs font-mono tracking-wider mb-4 uppercase">📡 Public API Documentation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
              {[
                { m: 'GET', p: '/api/search?q=', d: 'Search skills' },
                { m: 'GET', p: '/api/free-skills.json', d: '43 free skills' },
                { m: 'GET', p: '/api/skills.json', d: 'Full catalog' },
                { m: 'GET', p: '/api/categories.json', d: '58 categories' },
                { m: 'GET', p: '/api/agent.json', d: 'Agent documentation' },
                { m: 'GET', p: '/api/openapi.yaml', d: 'OpenAPI 3.1 spec' },
                { m: 'POST', p: '/api/audit-skill', d: 'Security audit' },
                { m: 'GET', p: '/api/bundles.json', d: 'Skill bundles' },
              ].map((e, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/40">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${e.m === 'POST' ? 'bg-[#00d1ff]/10 text-[#00d1ff]' : 'bg-[#00F299]/10 text-[#00F299]'}`}>{e.m}</span>
                  <code className="text-white text-xs font-mono">{e.p}</code>
                  <span className="text-zinc-600 text-[10px] ml-auto">{e.d}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-black/40 text-left">
              <div className="text-zinc-500 text-[10px] mb-1">MCP Server (Claude Desktop, Cursor, Cline):</div>
              <code className="text-[#00F299] text-xs font-mono">npx -y marketnow-mcp</code>
              <span className="text-zinc-600 text-[10px] ml-2">·</span>
              <a href="https://www.npmjs.com/package/marketnow-mcp" target="_blank" rel="noopener" className="text-zinc-500 text-[10px] ml-2 hover:text-[#00F299]">npm</a>
              <span className="text-zinc-600 text-[10px]">·</span>
              <a href="https://smithery.ai/servers/eddyflores100/marketnow" target="_blank" rel="noopener" className="text-zinc-500 text-[10px] hover:text-[#00F299]">Smithery</a>
            </div>
          </motion.div>

          {/* Payment options — both, transparent */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="premium-card p-6 max-w-3xl mx-auto mb-8">
            <h3 className="text-white text-xs font-mono tracking-wider mb-4 uppercase">💳 Payment Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#00F299]/5 border border-[#00F299]/10 text-left">
                <div className="text-[#00F299] text-sm font-bold mb-1">💳 Credit Card (Stripe)</div>
                <div className="text-zinc-400 text-xs">Standard checkout. Human approves each purchase. Secure, PCI-compliant.</div>
              </div>
              <div className="p-4 rounded-xl bg-[#00d1ff]/5 border border-[#00d1ff]/10 text-left">
                <div className="text-[#00d1ff] text-sm font-bold mb-1">₿ USDC (Base L2)</div>
                <div className="text-zinc-400 text-xs">On-chain payment. For agents with delegated spending limits. Verified on Base.</div>
              </div>
            </div>
            <p className="text-zinc-600 text-[10px] mt-3 text-center">
              Free skills require no payment. All skills include Sentinel security report.
            </p>
          </motion.div>

          {/* DUAL MODEL — ACP/AP2 delegated mandates */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="premium-card p-6 max-w-4xl mx-auto mb-12">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-white text-xs font-mono tracking-wider uppercase">🤝 Dual Trust Model (ACP / AP2)</h3>
              <Link to="/mandates" className="text-[#00F299] text-xs hover:underline">Manage mandates →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#00F299]/5 border border-[#00F299]/10 text-left">
                <div className="text-[#00F299] text-[10px] font-mono mb-1">MODE 1</div>
                <div className="text-white text-sm font-bold mb-1">Free / Verified</div>
                <div className="text-zinc-400 text-xs">Instant download. No payment, no mandate. Zero friction.</div>
              </div>
              <div className="p-4 rounded-xl bg-[#00d1ff]/5 border border-[#00d1ff]/10 text-left">
                <div className="text-[#00d1ff] text-[10px] font-mono mb-1">MODE 2 · DEFAULT</div>
                <div className="text-white text-sm font-bold mb-1">Within Mandate (notify)</div>
                <div className="text-zinc-400 text-xs">Agent buys autonomously. Human is notified on every purchase (email/webhook). "Silent" mode requires explicit opt-in.</div>
              </div>
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-left">
                <div className="text-yellow-400 text-[10px] font-mono mb-1">MODE 3</div>
                <div className="text-white text-sm font-bold mb-1">Beyond Mandate</div>
                <div className="text-zinc-400 text-xs">Agent must request approval. Human approves via Stripe or extends the mandate.</div>
              </div>
            </div>
            <p className="text-zinc-600 text-[10px] mt-4 text-center">
              Humans stay in control of spending. Agents stay autonomous within bounds. Every purchase is logged in a public git commit at _data/mandates/.
            </p>
          </motion.div>

          {/* Trust roadmap link */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center mb-12">
            <Link to="/trust" className="inline-flex items-center gap-2 px-5 py-3 border border-white/10 rounded-xl hover:bg-white/5 text-zinc-400 text-sm">
              <span>📋</span>
              <span>Read our public trust roadmap — what we've done and what's still pending</span>
              <span className="text-[#00F299]">→</span>
            </Link>
          </motion.div>

          {/* Value props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
            {[
              { icon: '🛡️', title: 'Sentinel Security', desc: '6-point MCP security audit on every skill. Auth, prompt injection, input validation, CORS, OAuth, rate limiting.' },
              { icon: '🧠', title: 'System Prompts', desc: 'Every skill includes a ready-to-use system prompt with rules, input/output format, and usage examples.' },
              { icon: '⚡', title: '1-Click Install', desc: 'npx -y @marketnow/install <slug>. Setup requirements listed. Know what API keys you need before buying.' },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="premium-card p-6">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-white font-bold text-sm mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/handshake" className="text-[#00F299] text-sm hover:underline">API Docs →</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/pricing" className="text-zinc-400 text-sm hover:underline">Pricing →</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/submit" className="text-zinc-400 text-sm hover:underline">Publish →</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/security" className="text-zinc-400 text-sm hover:underline">Security →</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/policies" className="text-zinc-400 text-sm hover:underline">Terms →</Link>
          </div>
          <p className="text-zinc-700 text-[10px] mt-4">© 2026 AliceLabs LLC · MIT License · Built for agents and humans</p>
        </motion.div>
      </div>
    </div>
  );
}
