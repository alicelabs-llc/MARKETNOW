import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AgentLanding() {
  const [stats, setStats] = useState({ total: 8535, free: 43 });

  useEffect(() => {
    fetch('/api/manifest.json')
      .then(r => r.json())
      .then(d => setStats(s => ({ ...s, total: d.total_skills || 8535 })))
      .catch(() => {});
    fetch('/api/free-skills.json')
      .then(r => r.json())
      .then(d => setStats(s => ({ ...s, free: d.skills?.length || 43 })))
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00F299] animate-pulse" />
            <span className="text-[#00F299] text-xs font-mono tracking-wider">
              🤖 AGENT-READY · MCP v1.0 · {stats.free} FREE SKILLS
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {stats.total.toLocaleString()} MCP Skills.<br/>
            <span className="bg-gradient-to-r from-[#00F299] to-[#00d1ff] bg-clip-text text-transparent">
              {stats.free} are FREE.
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            Every skill has a Sentinel security report, ready-to-use system prompt, and auto-configured install. The code is open source. What you get is trust, curation, and integration.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link to="/registry" className="px-8 py-4 bg-[#00F299] text-black font-bold rounded-xl hover:bg-[#00F299]/90 hover:scale-[1.02] transition-all shadow-lg shadow-[#00F299]/20">
              🎁 GET {stats.free} FREE SKILLS →
            </Link>
            <a href="https://www.npmjs.com/package/marketnow-mcp" target="_blank" rel="noopener" className="px-8 py-4 border border-[#00F299]/30 bg-[#00F299]/10 text-[#00F299] font-bold rounded-xl hover:bg-[#00F299]/20 transition-all">
              📦 INSTALL MCP SERVER
            </a>
          </div>

          {/* Quick start for agents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto mb-12">
            <div className="p-4 rounded-xl bg-black/60 border border-white/5 text-left">
              <div className="text-[#00F299] text-xs font-mono mb-1">1. INSTALL</div>
              <code className="text-white text-sm font-mono break-all">npx -y marketnow-mcp</code>
            </div>
            <div className="p-4 rounded-xl bg-black/60 border border-white/5 text-left">
              <div className="text-[#00F299] text-xs font-mono mb-1">2. GET FREE SKILLS</div>
              <code className="text-white text-sm font-mono break-all">curl /api/free-skills.json</code>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
            {[
              { value: stats.total.toLocaleString()+'+', label: 'VERIFIED SKILLS' },
              { value: '58', label: 'CATEGORIES' },
              { value: '5', label: 'LANGUAGES' },
              { value: '$0.99', label: 'STARTING PRICE' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white font-mono">{stat.value}</div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Value props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { icon: '🛡️', title: 'Sentinel Security', desc: 'Every skill scanned. Know what passed, what warned, what failed.' },
              { icon: '🌐', title: '5 Languages', desc: 'EN, ES, ZH, PT, FR. System prompts in your language.' },
              { icon: '⚡', title: '1-Click Install', desc: 'npx -y @marketnow/install <slug>. Just run.' },
            ].map((f) => (
              <div key={f.title} className="premium-card p-5">
                <div className="text-3xl mb-2">{f.icon}</div>
                <h3 className="text-white font-bold text-sm mb-1">{f.title}</h3>
                <p className="text-zinc-400 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Agent curl example */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 max-w-2xl mx-auto">
            <div className="p-4 rounded-xl bg-black/60 border border-white/5 text-left">
              <div className="text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-wider">Try the API</div>
              <code className="text-[#00F299] text-sm font-mono break-all">
                curl https://marketnow.site/api/free-skills.json | jq '.skills[0]'
              </code>
            </div>
          </motion.div>

          <div className="mt-8">
            <Link to="/handshake" className="text-[#00F299] text-sm hover:underline">Full API docs →</Link>
            <span className="mx-3 text-zinc-700">·</span>
            <Link to="/pricing" className="text-zinc-400 text-sm hover:underline">Pricing →</Link>
            <span className="mx-3 text-zinc-700">·</span>
            <Link to="/submit" className="text-zinc-400 text-sm hover:underline">Sell your skills →</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
