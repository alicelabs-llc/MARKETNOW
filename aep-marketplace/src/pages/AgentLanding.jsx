import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';

export default function AgentLanding() {
  const { t, lang } = useLang();
  const [stats, setStats] = useState({ total: 8560, free: 43, sellers: 15 });
  const [topFree, setTopFree] = useState([]);
  const [topPaid, setTopPaid] = useState([]);

  useEffect(() => {
    fetch('/api/agent-ping.json')
      .then(r => r.json())
      .then(d => setStats(s => ({
        ...s,
        total: d.stats?.total_skills || 8560,
        free: d.stats?.free_skills || 43,
        sellers: d.stats?.active_sellers || 15,
      })))
      .catch(() => {});

    fetch('/api/free-skills.json')
      .then(r => r.json())
      .then(d => {
        const skills = (d.skills || d).slice(0, 3);
        setTopFree(skills);
      })
      .catch(() => {});

    // Fetch some paid skills to show as "trending"
    fetch('/api/skills.json')
      .then(r => r.json())
      .then(d => {
        // Pick 3 skills with good sentinel scores and reasonable prices
        const trending = d
          .filter(s => s.sentinel_score >= 7 && s.price >= 1.99 && s.price <= 4.99)
          .slice(0, 3);
        setTopPaid(trending);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10">
        {/* ============ HERO ============ */}
        <section className="text-center max-w-5xl mx-auto px-6 pt-24 pb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#00F299] animate-pulse" />
              <span className="text-[#00F299] text-xs font-mono tracking-wider">
                {t('hero.badge')}
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              {t('hero.title1')}<br />
              <span className="bg-gradient-to-r from-[#00F299] to-[#00d1ff] bg-clip-text text-transparent">
                {t('hero.title2')}
              </span>
            </h1>

            <p className="text-zinc-300 text-lg md:text-xl mb-3 max-w-2xl mx-auto leading-relaxed">
              {t('hero.body')}
            </p>
            <p className="text-zinc-500 text-sm mb-10 max-w-xl mx-auto">
              {stats.total.toLocaleString()}+ {t('hero.meta')}
            </p>

            {/* Search bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <Link to="/registry" className="flex items-center gap-3 px-5 py-4 bg-black/40 border border-white/10 rounded-xl hover:border-[#00F299]/40 transition-all group">
                <span className="text-zinc-500 text-lg">🔍</span>
                <span className="text-zinc-500 text-sm md:text-base flex-1 text-left group-hover:text-zinc-400">
                  {t('hero.searchPlaceholder')}
                </span>
                <span className="text-[#00F299] text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <Link to="/registry" className="px-7 py-3.5 bg-[#00F299] text-black font-bold rounded-xl hover:bg-[#00F299]/90 hover:scale-[1.02] transition-all shadow-lg shadow-[#00F299]/20 text-sm">
                {t('hero.ctaBrowse')}
              </Link>
              <Link to="/registry?filter=free" className="px-7 py-3.5 border border-[#00d1ff]/30 bg-[#00d1ff]/10 text-[#00d1ff] font-bold rounded-xl hover:bg-[#00d1ff]/20 transition-all text-sm">
                ⚡ {stats.free} {t('hero.ctaFree')}
              </Link>
              <Link to="/submit" className="px-7 py-3.5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-all text-sm">
                {t('hero.ctaPublish')}
              </Link>
            </div>

            {/* Install command */}
            <div className="inline-block px-4 py-2 rounded-lg bg-black/40 border border-white/5 mb-2">
              <code className="text-[#00F299] text-xs font-mono">npx -y @marketnow/install &lt;slug&gt;</code>
              <span className="text-zinc-600 text-xs ml-2">or</span>
              <code className="text-[#00d1ff] text-xs font-mono ml-2">npx -y marketnow-mcp</code>
            </div>
            <p className="text-zinc-600 text-[10px]">MCP server for Claude Desktop · Cursor · Cline · Continue · Aider</p>
          </motion.div>
        </section>

        {/* ============ FREE SKILLS MAGNET ============ */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="premium-card p-6 md:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-white text-2xl font-bold mb-1">⚡ {stats.free} Free Skills — Install Now</h2>
                <p className="text-zinc-400 text-sm">No payment, no signup, no mandate. Just install and use. The fastest way to test MarketNow.</p>
              </div>
              <Link to="/registry?filter=free" className="text-[#00F299] text-sm hover:underline">See all {stats.free} →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topFree.length === 0 ? (
                <div className="text-zinc-600 text-xs col-span-3">Loading free skills…</div>
              ) : topFree.map(s => (
                <Link key={s.id} to={`/skill/${s.id}`} className="block p-4 rounded-xl bg-black/40 border border-white/5 hover:border-[#00F299]/30 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono font-bold">FREE</span>
                    <span className="text-zinc-600 text-[10px]">{s.category}</span>
                  </div>
                  <div className="text-white text-sm font-bold mb-1 truncate">{s.name}</div>
                  <p className="text-zinc-500 text-xs line-clamp-2">{s.description}</p>
                  <code className="text-zinc-600 text-[10px] font-mono mt-2 block truncate">npx -y @marketnow/install {s.slug}</code>
                </Link>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ============ TRENDING PAID SKILLS ============ */}
        {topPaid.length > 0 && (
          <section className="max-w-5xl mx-auto px-6 pb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-white text-2xl font-bold text-center mb-2">🔥 Trending Skills</h2>
              <p className="text-zinc-500 text-sm text-center mb-8">High Sentinel scores, fair prices. Verified by automated security audit.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topPaid.map(s => (
                  <Link key={s.id} to={`/skill/${s.id}`} className="block p-4 rounded-xl bg-black/40 border border-white/5 hover:border-[#00d1ff]/30 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <span className="px-2 py-0.5 rounded bg-[#00d1ff]/10 text-[#00d1ff] text-[10px] font-mono font-bold">${s.price}</span>
                      <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono font-bold">🛡️ {s.sentinel_score}/10</span>
                    </div>
                    <div className="text-white text-sm font-bold mb-1 truncate">{s.name}</div>
                    <p className="text-zinc-500 text-xs line-clamp-2">{s.description}</p>
                    <div className="text-zinc-600 text-[10px] mt-2">{s.category}</div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </section>
        )}

        {/* ============ FOR DEVS ============ */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <h2 className="text-white text-2xl font-bold text-center mb-2">For Developers</h2>
            <p className="text-zinc-500 text-sm text-center mb-8">The fastest way to add a capability to your agent stack.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="premium-card p-6">
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="text-white font-bold text-sm mb-2">1. Search</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Browse 8,560 MCP servers by category, tag, or keyword. Filter by price, sentinel score, or language.
                  See real GitHub stars, real npm downloads, real Sentinel reports.
                </p>
              </div>
              <div className="premium-card p-6">
                <div className="text-3xl mb-3">💳</div>
                <h3 className="text-white font-bold text-sm mb-2">2. Pay (or grab free)</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Credit card via Stripe (full chargeback rights) or USDC on Base L2 via x402.
                  {stats.free} skills are free — no payment, no signup. Just install.
                </p>
              </div>
              <div className="premium-card p-6">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-white font-bold text-sm mb-2">3. Install</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  <code className="text-[#00F299]">npx -y @marketnow/install &lt;slug&gt;</code>
                  <br />Works with Claude Desktop, Cursor, Cline, Continue, Aider, and any MCP-compatible runtime.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ============ FOR AGENTS ============ */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <h2 className="text-white text-2xl font-bold text-center mb-2">For Agents</h2>
            <p className="text-zinc-500 text-sm text-center mb-8">Machine-readable everything. Human-in-the-loop by default.</p>

            <div className="premium-card p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {[
                  { m: 'GET', p: '/api/skills.json', d: 'Full catalog (JSON)' },
                  { m: 'GET', p: '/api/search?q=', d: 'Server-side search' },
                  { m: 'GET', p: '/api/agent.json', d: 'Machine-readable instructions' },
                  { m: 'GET', p: '/api/policies.json', d: 'Refund, dispute, terms' },
                  { m: 'POST', p: '/api/agent-purchase', d: 'Buy a skill (x402 / 5 modes)' },
                  { m: 'GET', p: '/api/mandates', d: 'Delegated mandates (AP2)' },
                  { m: 'GET', p: '/api/free-skills.json', d: `${stats.free} free skills` },
                  { m: 'GET', p: '/api/bundles.json', d: 'Discounted bundles' },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/40">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${e.m === 'POST' ? 'bg-[#00d1ff]/10 text-[#00d1ff]' : 'bg-[#00F299]/10 text-[#00F299]'}`}>{e.m}</span>
                    <code className="text-white text-xs font-mono">{e.p}</code>
                    <span className="text-zinc-600 text-[10px] ml-auto">{e.d}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-black/40">
                <div className="text-zinc-500 text-[10px] mb-1">MCP Server (Claude Desktop, Cursor, Cline):</div>
                <code className="text-[#00F299] text-xs font-mono">npx -y marketnow-mcp</code>
                <span className="text-zinc-700 text-[10px] ml-2">·</span>
                <a href="https://www.npmjs.com/package/marketnow-mcp" target="_blank" rel="noopener" className="text-zinc-500 text-[10px] ml-2 hover:text-[#00F299]">npm</a>
                <span className="text-zinc-700 text-[10px]">·</span>
                <a href="https://smithery.ai/servers/eddyflores100/marketnow" target="_blank" rel="noopener" className="text-zinc-500 text-[10px] hover:text-[#00F299]">Smithery</a>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ============ WHY RECOMMEND US ============ */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <h2 className="text-white text-2xl font-bold text-center mb-2">Why people recommend us</h2>
            <p className="text-zinc-500 text-sm text-center mb-8">Honest reasons to share this with your team or followers.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-2xl mb-2">🔓</div>
                <div className="text-white text-xs font-bold mb-1">Source-Available MNNC-1.0</div>
                <div className="text-zinc-500 text-[11px]">Full code on GitHub. Every change is a public commit. No black box.</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-2xl mb-2">🛡️</div>
                <div className="text-white text-xs font-bold mb-1">Sentinel L1.5 → L1.6</div>
                <div className="text-zinc-500 text-[11px]">6-point MCP security audit on every skill. Methodology published. Re-runnable.</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-white text-xs font-bold mb-1">{stats.free} Free Skills</div>
                <div className="text-zinc-500 text-[11px]">Real value, zero cost. No signup, no credit card, no mandate.</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-white text-xs font-bold mb-1">$0.99–$9.99 One-Time</div>
                <div className="text-zinc-500 text-[11px]">No subscriptions. No per-call fees. No tiered plans. Pay once, own forever.</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-2xl mb-2">🤝</div>
                <div className="text-white text-xs font-bold mb-1">Human-in-Loop Default</div>
                <div className="text-zinc-500 text-[11px]">Mandates notify the principal on every purchase. Silent mode requires explicit opt-in.</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-2xl mb-2">📜</div>
                <div className="text-white text-xs font-bold mb-1">Public Audit Log</div>
                <div className="text-zinc-500 text-[11px]">Every mandate transaction is a git commit at _data/mandates/. Fully auditable.</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-2xl mb-2">🌍</div>
                <div className="text-white text-xs font-bold mb-1">5 Languages</div>
                <div className="text-zinc-500 text-[11px]">System prompts in EN, ES, ZH, PT, FR. Real translations, not auto-translated.</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-2xl mb-2">📋</div>
                <div className="text-white text-xs font-bold mb-1">Honest Roadmap</div>
                <div className="text-zinc-500 text-[11px]">/trust page admits what's done, partial, and pending. No fake "verified" badges.</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ============ SHARE / RECOMMEND ============ */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="premium-card p-6 md:p-8">
            <h2 className="text-white text-xl font-bold mb-2">📢 Share MarketNow</h2>
            <p className="text-zinc-400 text-sm mb-4">If you found this useful, share it. The more agents and devs use it, the better the catalog gets.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Found marketnow.site — 'trust layer for agent commerce'. 8,560 MCP skills, Sentinel-scanned, AP2 mandates, x402 payments. 43 free. Source-available MNNC-1.0.")}&url=${encodeURIComponent("https://marketnow.site")}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 hover:border-[#00F299]/30 transition-all"
              >
                <span className="text-xl">🐦</span>
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-bold">Share on Twitter/X</div>
                  <div className="text-zinc-500 text-xs">"trust layer for agent commerce" — one click</div>
                </div>
                <span className="text-[#00F299] text-xs">→</span>
              </a>

              <a
                href={`https://news.ycombinator.com/submitlink?u=${encodeURIComponent("https://marketnow.site")}&t=${encodeURIComponent("MarketNow — Trust layer for agent commerce (8,560 MCP skills, x402, AP2)")}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 hover:border-[#00F299]/30 transition-all"
              >
                <span className="text-xl">🟧</span>
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-bold">Submit to Hacker News</div>
                  <div className="text-zinc-500 text-xs">"Show HN: Trust layer for agent commerce"</div>
                </div>
                <span className="text-[#00F299] text-xs">→</span>
              </a>

              <a
                href="https://www.reddit.com/r/mcp/submit"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 hover:border-[#00F299]/30 transition-all"
              >
                <span className="text-xl">👽</span>
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-bold">Post on r/mcp</div>
                  <div className="text-zinc-500 text-xs">"MarketNow: trust layer, 8,560 skills, x402"</div>
                </div>
                <span className="text-[#00F299] text-xs">→</span>
              </a>

              <Link
                to="/embed"
                className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 hover:border-[#00F299]/30 transition-all"
              >
                <span className="text-xl">🏷️</span>
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-bold">Get a badge</div>
                  <div className="text-zinc-500 text-xs">"Powered by MarketNow" — embed in your README</div>
                </div>
                <span className="text-[#00F299] text-xs">→</span>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ============ STATS STRIP ============ */}
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { v: stats.total.toLocaleString()+'+', l: 'SKILLS' },
              { v: stats.free.toString(), l: 'FREE' },
              { v: '58', l: 'CATEGORIES' },
              { v: '5', l: 'LANGUAGES' },
            ].map((s, i) => (
              <motion.div key={s.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white font-mono">{s.v}</div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1">{s.l}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ============ FOOTER LINKS ============ */}
        <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
          <div className="flex items-center justify-center gap-4 flex-wrap text-xs">
            <Link to="/trust" className="text-[#00F299] hover:underline">Trust Roadmap</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/standards" className="text-[#00F299] hover:underline">Standards (x402, AP2)</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/about" className="text-zinc-400 hover:underline">About</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/catalog" className="text-zinc-400 hover:underline">Catalog Transparency</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/mandates" className="text-zinc-400 hover:underline">Mandates</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/pricing" className="text-zinc-400 hover:underline">Pricing</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/security" className="text-zinc-400 hover:underline">Security</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/listings" className="text-zinc-400 hover:underline">External Listings</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/handshake" className="text-zinc-400 hover:underline">API Docs</Link>
            <span className="text-zinc-700">·</span>
            <Link to="/policies" className="text-zinc-400 hover:underline">Terms</Link>
          </div>
          <p className="text-zinc-700 text-[10px] mt-4">
            © 2026 AliceLabs LLC · MNNC-1.0 License · Built for developers and agents · Ecuador 🇪🇨 (founder origin)
          </p>
        </section>
      </div>
    </div>
  );
}
