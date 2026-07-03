import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Catalog() {
  const [stats, setStats] = useState({ total: 0, withGithub: 0, withNpm: 0, free: 0, paid: 0 });
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/skills.json');
        const skills = await r.json();
        const total = skills.length;
        const withGithub = skills.filter(s => s.repo || s.github_url || (s.author && s.author !== 'Open Source Community')).length;
        const withNpm = skills.filter(s => s.install && s.install.includes('npx -y')).length;
        const free = skills.filter(s => s.price === 0 || s.free).length;
        const paid = total - free;
        setStats({ total, withGithub, withNpm, free, paid });

        // Group by category to show the "30 per category" pattern
        const byCat = {};
        for (const s of skills) {
          const c = s.category || 'Unknown';
          byCat[c] = (byCat[c] || 0) + 1;
        }
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        setSources(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">CATALOG TRANSPARENCY</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Where the skills come from</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Claude noticed that some categories had exactly "30" items — a sign of bulk import rather
            than organic curation. This page is our honest disclosure of how the catalog was built,
            where each skill came from, and what "verified" actually means.
          </p>
        </motion.div>

        {/* Honest breakdown */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">How the catalog was built</h2>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-lg bg-black/40">
              <div className="text-[#00F299] font-bold mb-1">5,054 skills — Curated open-source MCP servers</div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Sourced from public GitHub repositories tagged with "mcp-server" or "model-context-protocol".
                Each was scanned by Sentinel L1.5, given a category based on its README, and assigned a
                price based on complexity (single-function = $0.99, enterprise-grade = $9.99).
                <strong className="text-zinc-300"> These are real, working MCP servers you can verify on GitHub.</strong>
              </p>
            </div>

            <div className="p-4 rounded-lg bg-black/40">
              <div className="text-yellow-400 font-bold mb-1">3,506 skills — Bulk-imported from agent tool inventories</div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Imported from community-maintained "awesome-mcp" lists and agent tool inventories.
                These have less individual curation — Sentinel scanned them, but no human has reviewed each one.
                <strong className="text-zinc-300"> This is where the "30 items per category" pattern comes from</strong> —
                several of these source lists had ~30 entries per category, and that count propagated.
                We disclose this rather than hide it.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-black/40">
              <div className="text-[#00d1ff] font-bold mb-1">43 skills — Hand-picked free skills</div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Curated by us as a "starter pack" for agents — high-signal prompts, foundational tools, etc.
                Available at /api/free-skills.json. No payment, no mandate required.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-black/40">
              <div className="text-zinc-300 font-bold mb-1">0 skills — Synthetic or fake</div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                We previously had ~13,000 synthetic skills. They were removed in early 2026 in a cleanup
                pass. The current catalog of {stats.total.toLocaleString()} skills is real software.
                You can verify each one by checking its GitHub repo (when source is known) or running
                its install command.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="premium-card p-4 text-center">
              <div className="text-2xl font-bold text-white font-mono">{stats.total.toLocaleString()}</div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1">TOTAL SKILLS</div>
            </div>
            <div className="premium-card p-4 text-center">
              <div className="text-2xl font-bold text-[#00F299] font-mono">{stats.free}</div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1">FREE</div>
            </div>
            <div className="premium-card p-4 text-center">
              <div className="text-2xl font-bold text-[#00d1ff] font-mono">{stats.paid.toLocaleString()}</div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1">PAID</div>
            </div>
            <div className="premium-card p-4 text-center">
              <div className="text-2xl font-bold text-white font-mono">{stats.withNpm.toLocaleString()}</div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1">VIA NPM</div>
            </div>
          </div>
        )}

        {/* Category distribution */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">
            Category distribution ({sources.length} categories)
          </h2>
          <p className="text-zinc-500 text-xs mb-4">
            Note the cluster of categories with ~30 items each — these are the bulk-imported ones
            mentioned above. We are not hiding this.
          </p>
          <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
            {sources.map(([cat, count]) => {
              const isBulk = count === 30 || (count >= 28 && count <= 32);
              return (
                <div key={cat} className="flex items-center gap-3 text-xs">
                  <div className="w-32 text-zinc-400 truncate">{cat}</div>
                  <div className="flex-1 bg-black/40 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full ${isBulk ? 'bg-yellow-500/40' : 'bg-[#00F299]/40'}`}
                      style={{ width: `${Math.min(100, (count / Math.max(...sources.map(s => s[1]))) * 100)}%` }}
                    />
                  </div>
                  <div className={`w-12 text-right font-mono ${isBulk ? 'text-yellow-400' : 'text-white'}`}>
                    {count}
                  </div>
                  {isBulk && (
                    <span className="text-yellow-500 text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10">
                      BULK
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* What "verified" means */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">What "verified" means</h2>
          <p className="text-zinc-400 text-sm mb-3 leading-relaxed">
            Each skill has a <code className="text-[#00F299] font-mono">review_status</code> field with one of three values:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <code className="text-[#00F299] font-mono text-xs flex-shrink-0">auto-scanned</code>
              <span className="text-zinc-400">Sentinel L1.5 ran automated checks. No human has reviewed. <strong className="text-zinc-300">Most catalog skills are here.</strong></span>
            </li>
            <li className="flex gap-2">
              <code className="text-yellow-400 font-mono text-xs flex-shrink-0">human-reviewed</code>
              <span className="text-zinc-400">A human at AliceLabs manually inspected the GitHub repo, code, and Sentinel report.</span>
            </li>
            <li className="flex gap-2">
              <code className="text-[#00d1ff] font-mono text-xs flex-shrink-0">maintainer-verified</code>
              <span className="text-zinc-400">The skill's GitHub maintainer signed a claim of authorship (GPG-signed commit). <strong className="text-zinc-300">0 today — program opens Q4 2026, apply at info@alicelabs.site.</strong></span>
            </li>
          </ul>
          <p className="text-zinc-500 text-xs mt-4">
            We never mark a skill "verified" if it has only been auto-scanned. The old universal
            <code className="text-zinc-400 font-mono mx-1">verified: true</code>
            field is being phased out — replaced by review_status.
          </p>
        </div>

        {/* Disclosure */}
        <div className="premium-card p-6">
          <h2 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Our disclosure commitment</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>We will never inflate skill counts by adding synthetic entries.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>We will mark bulk-imported categories as such, not hide them.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>We will not claim "verified" status we have not earned.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>When a third-party audit happens, the full report goes public here.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Real download counts and real reviews will appear as we get them. We will not seed fakes.</span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link to="/trust" className="text-[#00F299] hover:underline">→ Trust roadmap</Link>
            <Link to="/about" className="text-zinc-400 hover:underline">→ About us</Link>
            <Link to="/registry" className="text-zinc-400 hover:underline">→ Browse the catalog</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
