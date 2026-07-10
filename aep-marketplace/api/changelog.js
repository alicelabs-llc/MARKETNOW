// MarketNow — Changelog API
// GET /api/changelog — returns recent changes agents should know about
// Agents poll this to stay updated on new features, breaking changes, new skills

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  res.status(200).json({
    service: 'MarketNow',
    current_version: '4.0.0',
    changelog: [
      {
        version: '4.0.0',
        date: '2026-07-10',
        changes: [
          'Added /api/trust-score endpoint for agent trust decisions',
          'Added /api/manifest endpoint for one-call agent discovery',
          'Added /api/health endpoint (ultra-lightweight, 34 bytes)',
          'Added /api/skills/{id} dynamic route for skill details',
          'Added /api/changelog endpoint',
          'Added /api/recommend endpoint for skill recommendations',
          'Added /tools/config-generator.html',
          'Added /tools/playground.html',
          'Added /tools/stats.html',
          'Added /tools/scan.html',
          'Added /for-agents page (agent discovery hub)',
          'MCP HTTP endpoint now supports SSE + JSON-RPC',
          'Sentinel L2.5 gVisor sandbox is live',
        ],
        breaking: [],
        new_endpoints: [
          '/api/trust-score',
          '/api/manifest',
          '/api/health',
          '/api/skills/{id}',
          '/api/recommend',
          '/api/changelog',
          '/api/mcp (HTTP transport)',
        ],
      },
      {
        version: '3.0.0',
        date: '2026-07-06',
        changes: [
          'Sentinel L2 v2.0 — active MCP probe with 60+ adversarial inputs',
          'Sentinel L2.5 — gVisor sandbox isolation (userspace kernel)',
          'Dynamic canonical URLs for SEO',
          'llms.txt and llms-full.txt for LLM discoverability',
          'ai.txt for AI crawler permissions',
          'IndexNow integration (Bing/Yandex instant indexing)',
        ],
        breaking: [],
      },
      {
        version: '2.0.0',
        date: '2026-07-02',
        changes: [
          'Sentinel L1.5 — 6 metadata security checks',
          'Sentinel L1.6 — Semgrep + secrets + OSV',
          'AP2 mandates with human-in-the-loop by default',
          'x402 payments (HTTP 402 + USDC on Base)',
          '5 languages: EN, ES, ZH, PT, FR',
        ],
        breaking: ['Mandates now default to notify mode (was silent)'],
      },
    ],
    timestamp: new Date().toISOString(),
  });
}
