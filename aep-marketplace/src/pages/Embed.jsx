import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const BADGES = [
  {
    id: 'powered-by',
    label: 'Powered by MarketNow',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="28" viewBox="0 0 180 28"><rect width="180" height="28" rx="4" fill="#050505" stroke="#00F299"/><rect width="90" height="28" rx="4" fill="#00F299"/><text x="45" y="19" font-family="monospace" font-size="11" font-weight="bold" fill="#050505" text-anchor="middle">MarketNow</text><text x="135" y="19" font-family="monospace" font-size="11" fill="#00F299" text-anchor="middle">Powered by</text></svg>`,
    markdown: '![Powered by MarketNow](https://marketnow.site/badges/powered-by.svg)](https://marketnow.site)',
    html: '<a href="https://marketnow.site"><img src="https://marketnow.site/badges/powered-by.svg" alt="Powered by MarketNow" /></a>',
  },
  {
    id: 'verified-skill',
    label: 'Sentinel L1.5 Verified',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="28" viewBox="0 0 160 28"><rect width="160" height="28" rx="4" fill="#050505" stroke="#00F299"/><text x="80" y="19" font-family="monospace" font-size="11" font-weight="bold" fill="#00F299" text-anchor="middle">🛡️ Sentinel L1.5</text></svg>`,
    markdown: '![Sentinel L1.5](https://marketnow.site/badges/verified-skill.svg)](https://marketnow.site/security)',
    html: '<a href="https://marketnow.site/security"><img src="https://marketnow.site/badges/verified-skill.svg" alt="Sentinel L1.5 Verified" /></a>',
  },
  {
    id: 'open-source',
    label: 'Open Source MIT',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="28" viewBox="0 0 140 28"><rect width="140" height="28" rx="4" fill="#050505" stroke="#00d1ff"/><text x="70" y="19" font-family="monospace" font-size="11" font-weight="bold" fill="#00d1ff" text-anchor="middle">🔓 MIT License</text></svg>`,
    markdown: '![MIT License](https://marketnow.site/badges/open-source.svg)](https://github.com/edgarfloresguerra2011-a11y/marketnow)',
    html: '<a href="https://github.com/edgarfloresguerra2011-a11y/marketnow"><img src="https://marketnow.site/badges/open-source.svg" alt="Open Source MIT" /></a>',
  },
  {
    id: 'available-on',
    label: 'Available on MarketNow',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="28" viewBox="0 0 180 28"><rect width="180" height="28" rx="4" fill="#050505" stroke="#00F299"/><rect width="100" height="28" rx="4" fill="#00F299"/><text x="50" y="19" font-family="monospace" font-size="11" font-weight="bold" fill="#050505" text-anchor="middle">Available on</text><text x="140" y="19" font-family="monospace" font-size="11" fill="#00F299" text-anchor="middle">MarketNow</text></svg>`,
    markdown: '![Available on MarketNow](https://marketnow.site/badges/available-on.svg)](https://marketnow.site)',
    html: '<a href="https://marketnow.site"><img src="https://marketnow.site/badges/available-on.svg" alt="Available on MarketNow" /></a>',
  },
];

export default function Embed() {
  const [copied, setCopied] = useState(null);

  function copy(text, id) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">SHAREABLE BADGES</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Embed MarketNow</h1>
          <p className="text-zinc-400 text-lg">
            Add a badge to your README, docs, or landing page. Show that your MCP server is on MarketNow,
            that it passed Sentinel L1.5, or just that you support open source agent tooling.
          </p>
        </motion.div>

        <div className="space-y-6">
          {BADGES.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="premium-card p-6"
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-white text-sm font-bold">{b.label}</h2>
                <div dangerouslySetInnerHTML={{ __html: b.svg }} />
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-zinc-500 text-[10px] mb-1 font-mono">MARKDOWN</div>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black/40 border border-white/5 rounded p-2 text-[#00F299] text-xs font-mono break-all">{b.markdown}</code>
                    <button
                      onClick={() => copy(b.markdown, b.id + '-md')}
                      className="px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-xs hover:bg-black/60 font-mono"
                    >
                      {copied === b.id + '-md' ? '✓ COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-zinc-500 text-[10px] mb-1 font-mono">HTML</div>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black/40 border border-white/5 rounded p-2 text-[#00d1ff] text-xs font-mono break-all">{b.html}</code>
                    <button
                      onClick={() => copy(b.html, b.id + '-html')}
                      className="px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-xs hover:bg-black/60 font-mono"
                    >
                      {copied === b.id + '-html' ? '✓ COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* How to use */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 premium-card p-6">
          <h3 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">How to use</h3>
          <ol className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2"><span className="text-[#00F299] font-mono">1.</span> Pick the badge that fits your project.</li>
            <li className="flex gap-2"><span className="text-[#00F299] font-mono">2.</span> Copy the Markdown (for GitHub README) or HTML (for docs/sites).</li>
            <li className="flex gap-2"><span className="text-[#00F299] font-mono">3.</span> Paste it. The SVG is served from marketnow.site/badges/.</li>
            <li className="flex gap-2"><span className="text-[#00F299] font-mono">4.</span> When someone clicks, they land on MarketNow.</li>
          </ol>
          <p className="text-zinc-600 text-xs mt-4">
            Want a custom badge for your specific skill? Use <code className="text-zinc-400 font-mono">https://marketnow.site/badges/skill/&lt;slug&gt;.svg</code> — it'll show the skill name, price, and sentinel score.
          </p>
        </motion.div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-[#00F299] text-sm hover:underline">← Back to marketplace</Link>
        </div>
      </div>
    </div>
  );
}
