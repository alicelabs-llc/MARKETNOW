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

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00F299] animate-pulse" />
            <span className="text-[#00F299] text-xs font-mono tracking-wider">
              🤖 AGENT-NATIVE · USDC PAYMENTS · ZERO HUMAN FRICTION
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

          {/* Subtitle */}
          <p className="text-zinc-400 text-lg md:text-xl mb-2 max-w-2xl mx-auto leading-relaxed">
            {stats.total.toLocaleString()}+ verified MCP skills. Pay with USDC on Base.
            No credit cards. No humans. Just agents and skills.
          </p>
          <p className="text-zinc-600 text-sm mb-10 max-w-xl mx-auto">
            Every skill includes Sentinel security report, system prompt, and 1-click install.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/registry" className="px-8 py-4 bg-[#00F299] text-black font-bold rounded-xl hover:bg-[#00F299]/90 hover:scale-[1.02] transition-all shadow-lg shadow-[#00F299]/20">
              BROWSE {stats.total.toLocaleString()} SKILLS →
            </Link>
            <a href="https://www.npmjs.com/package/marketnow-mcp" target="_blank" rel="noopener" className="px-8 py-4 border border-[#00F299]/30 bg-[#00F299]/10 text-[#00F299] font-bold rounded-xl hover:bg-[#00F299]/20 transition-all">
              📦 INSTALL MCP SERVER
            </a>
            <Link to="/submit" className="px-8 py-4 border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-all">
              + SELL SKILLS
            </Link>
          </div>

          {/* Agent purchase flow */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="premium-card p-6 mb-12 max-w-3xl mx-auto">
            <h3 className="text-[#00F299] text-xs font-mono tracking-wider mb-4 uppercase">🤖 Autonomous Purchase Flow</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-left">
              {[
                { n: '1', t: 'Search', c: 'GET /api/search', color: 'text-[#00F299]' },
                { n: '2', t: 'Pay USDC', c: 'Send to 0x39Dd...f5Ee', color: 'text-[#00d1ff]' },
                { n: '3', t: 'Verify', c: 'POST /api/agent-purchase', color: 'text-[#00F299]' },
                { n: '4', t: 'Receive', c: 'License + Prompt', color: 'text-[#00d1ff]' },
                { n: '5', t: 'Install', c: 'npx -y @marketnow/...', color: 'text-[#00F299]' },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className={`text-xs font-mono ${s.color}`}>STEP {s.n}</div>
                  <div className="text-white text-sm font-semibold mt-1">{s.t}</div>
                  <div className="text-zinc-500 text-[10px] font-mono mt-1">{s.c}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-[#00F299]/5 border border-[#00F299]/10 text-left">
              <code className="text-[#00F299] text-xs font-mono break-all">
                curl https://marketnow.site/api/agent-wallet | jq .payment
              </code>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
            {[
              { value: stats.total.toLocaleString()+'+', label: 'VERIFIED SKILLS' },
              { value: stats.free.toString(), label: 'FREE SKILLS' },
              { value: stats.sellers.toString(), label: 'ACTIVE SELLERS' },
              { value: '5', label: 'LANGUAGES' },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white font-mono">{stat.value}</div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Value props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
            {[
              { icon: '🛡️', title: 'Sentinel Security', desc: '6-point MCP security audit. Auth, injection, validation, CORS, OAuth, rate limiting. Know what passed and what failed.' },
              { icon: '💳', title: 'USDC Payments', desc: 'Pay with USDC on Base. No credit cards. No humans. Agents buy autonomously. License key returned instantly.' },
              { icon: '⚡', title: '1-Click Install', desc: 'npx -y @marketnow/install <slug>. System prompt included. Setup requirements listed. Ready to use.' },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="premium-card p-6">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-white font-bold text-sm mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* API endpoints */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="premium-card p-6 max-w-3xl mx-auto mb-8">
            <h3 className="text-[#00F299] text-xs font-mono tracking-wider mb-4 uppercase">📡 Agent API (no auth required)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
              {[
                { m: 'GET', p: '/api/search?q=', d: 'Search skills' },
                { m: 'GET', p: '/api/free-skills.json', d: '43 free skills' },
                { m: 'GET', p: '/api/agent-wallet', d: 'Payment info' },
                { m: 'POST', p: '/api/agent-purchase', d: 'Buy with USDC' },
                { m: 'POST', p: '/api/audit-skill', d: 'Security audit' },
                { m: 'GET', p: '/api/skills.json', d: 'All 8,560 skills' },
                { m: 'GET', p: '/api/categories.json', d: '58 categories' },
                { m: 'GET', p: '/api/bundles.json', d: 'Skill bundles' },
              ].map((e, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/40">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${e.m === 'POST' ? 'bg-[#00d1ff]/10 text-[#00d1ff]' : 'bg-[#00F299]/10 text-[#00F299]'}`}>{e.m}</span>
                  <code className="text-white text-xs font-mono">{e.p}</code>
                  <span className="text-zinc-600 text-[10px] ml-auto">{e.d}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Footer links */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/handshake" className="text-[#00F299] text-sm hover:underline">API Docs →</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/pricing" className="text-zinc-400 text-sm hover:underline">Pricing →</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/submit" className="text-zinc-400 text-sm hover:underline">Sell Skills →</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/security" className="text-zinc-400 text-sm hover:underline">Security →</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
