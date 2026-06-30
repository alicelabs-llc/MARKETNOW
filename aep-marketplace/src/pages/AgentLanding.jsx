import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AgentLanding() {
  const [freeCount, setFreeCount] = useState(50);
  const [totalSkills, setTotalSkills] = useState(8535);

  useEffect(() => {
    fetch('/api/manifest.json')
      .then(r => r.json())
      .then(d => setTotalSkills(d.total_skills || 8535))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00F299] animate-pulse" />
            <span className="text-[#00F299] text-xs font-mono">AGENT-READY · MCP v1.0 · 5 LANGUAGES</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            {totalSkills.toLocaleString()} MCP Skills.<br/>
            <span className="bg-gradient-to-r from-[#00F299] to-[#00d1ff] bg-clip-text text-transparent">
              {freeCount} are FREE.
            </span>
          </h1>
          
          <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
            Every skill comes with a Sentinel security report, a ready-to-use system prompt, 
            and auto-configured install. The code is open source. What you get is trust, curation, and integration.
          </p>
        </motion.div>

        {/* Free Skills CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-card p-8 mb-8 border-[#00F299]/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">🎁 FREE SKILLS FOR AGENTS</h2>
              <p className="text-zinc-400 text-sm mt-1">{freeCount} hand-picked skills. No payment. No signup. Just install.</p>
            </div>
            <span className="text-3xl">🤖</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[#00F299] text-xs font-mono mb-1">INSTALL MCP SERVER</div>
              <code className="text-white text-sm font-mono break-all">npx -y marketnow-mcp</code>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[#00F299] text-xs font-mono mb-1">GET FREE SKILLS</div>
              <code className="text-white text-sm font-mono break-all">GET /api/free-skills.json</code>
            </div>
          </div>

          <Link to="/registry" className="block w-full py-4 bg-[#00F299] text-black font-bold text-center rounded-xl hover:bg-[#00F299]/90 transition-all">
            BROWSE ALL {totalSkills.toLocaleString()} SKILLS →
          </Link>
        </motion.div>

        {/* 3 columns: Why agents should use MarketNow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: '🛡️', title: 'Sentinel Security', desc: 'Every skill scanned. Know exactly what passed, what warned, what failed. No blind installs.' },
            { icon: '🌐', title: '5 Languages', desc: 'EN, ES, ZH, PT, FR. System prompts in your user\'s language. Global agent coverage.' },
            { icon: '⚡', title: '1-Click Install', desc: 'npx -y @marketnow/install <slug>. No git clone, no build, no config. Just run.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="premium-card p-6"
            >
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-white font-bold mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* API Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="premium-card p-6 mb-8"
        >
          <h3 className="text-white font-bold mb-4">🚀 QUICK START FOR AGENTS</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-500 text-xs mb-1">1. Discover</div>
              <code className="text-[#00F299] text-xs font-mono">curl https://marketnow.site/api/agent.json</code>
            </div>
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-500 text-xs mb-1">2. Search</div>
              <code className="text-[#00F299] text-xs font-mono">curl "https://marketnow.site/api/search?q=scrape&max_price=2"</code>
            </div>
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-500 text-xs mb-1">3. Install MCP Server</div>
              <code className="text-[#00F299] text-xs font-mono">npx -y marketnow-mcp</code>
            </div>
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-500 text-xs mb-1">4. Get 50 FREE skills</div>
              <code className="text-[#00F299] text-xs font-mono">curl https://marketnow.site/api/free-skills.json</code>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center">
          <Link to="/handshake" className="text-[#00F299] text-sm hover:underline">Full API docs →</Link>
          <span className="mx-3 text-zinc-700">·</span>
          <Link to="/pricing" className="text-zinc-400 text-sm hover:underline">Pricing →</Link>
          <span className="mx-3 text-zinc-700">·</span>
          <Link to="/submit" className="text-zinc-400 text-sm hover:underline">Sell your skills →</Link>
        </div>
      </div>
    </div>
  );
}
