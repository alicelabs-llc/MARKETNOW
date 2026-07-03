import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">ABOUT · ALICELABS LLC</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Who we are</h1>
          <p className="text-zinc-400 text-lg">
            MarketNow is built and maintained by AliceLabs LLC, a small software company based in Ecuador.
            We have no investors, no employees besides the founder, and no marketing budget. We are
            building this in public.
          </p>
        </motion.div>

        {/* Identity card */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">Company</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-zinc-500 text-xs mb-1">Legal name</div>
              <div className="text-white">AliceLabs LLC</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Founder</div>
              <div className="text-white">Edison Flores</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Country</div>
              <div className="text-white">Ecuador 🇪🇨</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Founded</div>
              <div className="text-white">2024</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Email</div>
              <a href="mailto:info@alicelabs.site" className="text-[#00F299] hover:underline">info@alicelabs.site</a>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Domain</div>
              <a href="https://marketnow.site" className="text-[#00F299] hover:underline">marketnow.site</a>
            </div>
          </div>
        </div>

        {/* Public accounts */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">Public accounts</h2>
          <div className="space-y-3">
            <a
              href="https://github.com/edgarfloresguerra2011-a11y/marketnow"
              target="_blank"
              rel="noopener"
              className="block p-4 rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
            >
              <div className="text-white text-sm font-bold">GitHub — edgarfloresguerra2011-a11y/marketnow</div>
              <div className="text-zinc-500 text-xs">Full source code, MIT licensed. Every commit visible.</div>
            </a>
            <a
              href="https://www.npmjs.com/package/marketnow-mcp"
              target="_blank"
              rel="noopener"
              className="block p-4 rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
            >
              <div className="text-white text-sm font-bold">npm — marketnow-mcp</div>
              <div className="text-zinc-500 text-xs">Our MCP server package. Download counts are public.</div>
            </a>
            <a
              href="https://smithery.ai/servers/eddyflores100/marketnow"
              target="_blank"
              rel="noopener"
              className="block p-4 rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
            >
              <div className="text-white text-sm font-bold">Smithery — eddyflores100/marketnow</div>
              <div className="text-zinc-500 text-xs">Smithery registry listing with quality score (84/100).</div>
            </a>
            <div className="p-4 rounded-lg bg-black/40">
              <div className="text-white text-sm font-bold">Payment wallet (Base L2)</div>
              <div className="text-zinc-500 text-xs font-mono break-all mt-1">0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee</div>
              <div className="text-zinc-600 text-[10px] mt-1">All USDC payments go here. Auditable on Basescan.</div>
            </div>
          </div>
        </div>

        {/* What we are not */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">What we are not</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-red-400">✗</span>
              <span>We are not a funded startup. We have no Series A, no angel investors, no VC backing.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">✗</span>
              <span>We are not a security firm. Our Sentinel audit is automated and self-declared — see <Link to="/trust" className="text-[#00F299] hover:underline">/trust</Link> for the disclosure.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">✗</span>
              <span>We do not have a sustained track record yet. We launched in 2026. Trust is earned over time, not claimed.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">✗</span>
              <span>We do not have third-party press coverage yet. We are working on it.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">✗</span>
              <span>We do not have a bug bounty program yet (private one running; public launch when 1,000 active mandates exist).</span>
            </li>
          </ul>
        </div>

        {/* What we are */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">What we are</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Open source — MIT licensed, full code on GitHub, every change is a public commit</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Transparent — every mandate spend is a git commit visible at _data/mandates/</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Honest — our <Link to="/trust" className="text-[#00F299] hover:underline">trust roadmap</Link> admits what is done, partial, and pending</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Agent-native — our API and MCP server are designed for AI consumption, not just humans</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Human-first defaults — mandates notify the principal by default; "silent" mode requires explicit opt-in</span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="premium-card p-6">
          <h2 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Contact</h2>
          <p className="text-zinc-400 text-sm mb-3">
            For disputes, security disclosures, or business inquiries:
          </p>
          <a
            href="mailto:contact@alicelabs.site?subject=MarketNow%20inquiry"
            className="inline-block px-5 py-3 bg-[#00F299] text-black font-bold rounded-lg hover:bg-[#00F299]/90 transition-all text-sm"
          >
            info@alicelabs.site →
          </a>
          <p className="text-zinc-600 text-[10px] mt-3">
            PGP key available on request. Security disclosures accepted via encrypted email; we will acknowledge within 48h.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link to="/trust" className="text-[#00F299] text-sm hover:underline">← Back to trust roadmap</Link>
        </div>
      </div>
    </div>
  );
}
