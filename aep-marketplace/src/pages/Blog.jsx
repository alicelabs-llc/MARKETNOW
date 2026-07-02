import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const POSTS = [
  {
    slug: 'top-20-mcp-servers-claude-desktop-2026',
    title: 'Top 20 MCP Servers for Claude Desktop in 2026',
    excerpt: 'A curated list of the most useful MCP servers you can install in Claude Desktop right now. Each one Sentinel-scanned, with install command and use case.',
    date: '2026-07-02',
    readTime: '8 min',
    tags: ['mcp', 'claude', 'guide'],
  },
  {
    slug: 'what-is-x402-payment-protocol',
    title: 'What is x402? HTTP 402 Payment Required for AI agents',
    excerpt: 'x402 revives the unused HTTP 402 status code for native HTTP-level payments. Learn how it works, why it matters for agent commerce, and how MarketNow implements it.',
    date: '2026-07-02',
    readTime: '5 min',
    tags: ['x402', 'payments', 'agents'],
  },
  {
    slug: 'ap2-agent-payments-protocol-explained',
    title: 'AP2 (Agent Payments Protocol) explained: delegated mandates for AI agents',
    excerpt: 'Google\'s AP2 protocol lets humans pre-authorize AI agents to spend within limits. Here\'s how it works, why human-in-the-loop matters, and how we implement it.',
    date: '2026-07-02',
    readTime: '6 min',
    tags: ['ap2', 'mandates', 'security'],
  },
  {
    slug: 'mcp-security-audit-sentinel-l15',
    title: 'How Sentinel L1.5 audits MCP servers (6-point security scan)',
    excerpt: 'Sentinel L1.5 scans every MCP server for 6 security issues: auth, prompt injection, input validation, CORS, OAuth scopes, and rate limiting. Here\'s the methodology.',
    date: '2026-07-02',
    readTime: '7 min',
    tags: ['security', 'sentinel', 'mcp'],
  },
  {
    slug: 'install-mcp-server-cursor-step-by-step',
    title: 'How to install an MCP server in Cursor (step by step)',
    excerpt: 'A complete guide to adding MCP servers to Cursor IDE. Includes configuration, troubleshooting, and 5 recommended servers to start with.',
    date: '2026-07-02',
    readTime: '4 min',
    tags: ['cursor', 'guide', 'mcp'],
  },
];

export default function Blog() {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">BLOG · SEO CONTENT</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">MarketNow Blog</h1>
          <p className="text-zinc-400 text-lg">
            Guides, tutorials, and deep dives on MCP servers, agent commerce, x402, AP2, and security.
          </p>
        </motion.div>

        <div className="space-y-4">
          {POSTS.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="premium-card p-6 hover:border-[#00F299]/30 transition-all"
            >
              <div className="flex items-center gap-3 mb-2 text-xs">
                <span className="text-zinc-500">{post.date}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-500">{post.readTime} read</span>
                <div className="flex gap-1 ml-auto">
                  {post.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded bg-black/40 text-zinc-500 text-[10px] font-mono">#{t}</span>
                  ))}
                </div>
              </div>
              <h2 className="text-white text-xl font-bold mb-2 hover:text-[#00F299] cursor-pointer">
                {post.title}
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-3">{post.excerpt}</p>
              <Link to={`/blog/${post.slug}`} className="text-[#00F299] text-sm hover:underline">Read more →</Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-[#00F299] text-sm hover:underline">← Back to marketplace</Link>
        </div>
      </div>
    </div>
  );
}
