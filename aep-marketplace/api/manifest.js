// MarketNow — Enhanced Agent Manifest
// GET /api/manifest — returns all agent-discoverable endpoints in one call
// Agents fetch this ONCE to discover everything MarketNow offers

import { secureLight } from '../lib/secure.mjs';

export default secureLight(async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

  res.status(200).json({
    service: 'MarketNow',
    version: '4.0.0',
    description: 'Trust layer for agent commerce. 7,063 MCP servers, each security-audited by Sentinel L2.5.',
    homepage: 'https://marketnow.site',
    
    // Agent connection methods
    connect: {
      mcp_stdio: {
        command: 'npx -y marketnow-mcp',
        npm: 'https://www.npmjs.com/package/marketnow-mcp',
      },
      mcp_http: {
        url: 'https://marketnow.site/api/mcp',
        transport: 'SSE + JSON-RPC',
        protocol_version: '2024-11-05',
      },
      rest_api: {
        base_url: 'https://marketnow.site/api',
        openapi: 'https://marketnow.site/api/openapi.yaml',
      },
    },
    
    // Agent-useful endpoints (compact, machine-readable)
    endpoints: {
      search: {
        method: 'GET',
        path: '/api/search?q={query}&max_price={price}&limit={limit}',
        description: 'Search MCP skills by keyword, category, or price',
        auth: 'none',
      },
      skill_detail: {
        method: 'GET',
        path: '/api/skills/{skillId}',
        description: 'Get full details of a specific skill',
        auth: 'none',
      },
      trust_score: {
        method: 'GET',
        path: '/api/trust-score?skillId={skillId}',
        description: 'Get a compact trust score for install decisions',
        auth: 'none',
        returns: ['trust_score (0-10)', 'recommendation (safe_to_install|install_with_caution|do_not_install)', 'certificate_url'],
      },
      recommend: {
        method: 'POST',
        path: '/api/recommend',
        description: 'Get skill recommendations based on current tools',
        body: '{ "current_tools": ["filesystem"], "agent_type": "coding" }',
        auth: 'none',
      },
      certificate: {
        method: 'GET',
        path: '/api/audit-skill?certificate=1&skillId={skillId}',
        description: 'Get signed SHA-256 security certificate',
        auth: 'none',
      },
      free_skills: {
        method: 'GET',
        path: '/api/free-skills.json',
        description: '65 free skills (no signup, no payment)',
        auth: 'none',
      },
      purchase: {
        method: 'POST',
        path: '/api/agent-purchase',
        description: 'Purchase a skill (USDC on Base or Stripe)',
        auth: 'payment_proof',
        payment_methods: ['usdc_base', 'stripe'],
      },
      audit_request: {
        method: 'POST',
        path: '/api/audit-skill',
        description: 'Trigger a security audit for a new MCP server',
        auth: 'github',
      },
      sbom: {
        method: 'GET',
        path: '/api/audit-skill?sbom=1&skillId={skillId}',
        description: 'L4 Supply Chain Audit — SBOM + OSV vulnerability check',
        auth: 'none',
      },
      content_fingerprint: {
        method: 'GET',
        path: '/sbom-schema.json',
        description: 'L4.5 Content fingerprint schema — SHA-256 of repo HEAD',
        auth: 'none',
      },
      acp: {
        method: 'ANY',
        path: '/api/acp',
        description: 'ACP — Agent Communication Protocol. Discover, negotiate, transact with other agents.',
        auth: 'none',
        spec: '/acp-spec.json',
      },
      egress_allowlist: {
        method: 'GET',
        path: '/egress-allowlist.json',
        description: 'L2.6 egress proxy allowlist — domains that MCP servers can contact during sandbox testing',
        auth: 'none',
      },
      failure_taxonomy: {
        method: 'GET',
        path: '/failure-taxonomy.json',
        description: 'Structured failure codes for agent self-diagnosis (15 categories)',
        auth: 'none',
        returns: ['failure_categories', 'agent_decision_tree'],
      },
      mcp_protocol: {
        method: 'POST',
        path: '/api/mcp',
        description: 'MCP JSON-RPC 2.0 endpoint (initialize, tools/list, tools/call)',
        auth: 'none',
        tools: ['search_skills', 'get_skill', 'list_categories', 'health'],
      },
    },
    
    // Stats (cached, fast)
    stats: {
      total_skills: 7063,
      audited: 5120,
      l25_tested: 206,
      free_skills: 65,
      categories: 23,
      sentinel_version: 'L2.5',
    },
    
    // Security
    security: {
      audit_pipeline: 'Sentinel L1.5 → L1.6 → L2 v2.0 → L2.5 gVisor sandbox',
      certificate_algorithm: 'SHA-256',
      verify_url: 'https://marketnow.site/verify',
      methodology_url: 'https://marketnow.site/security',
    },
    
    // Payment
    payment: {
      methods: ['stripe', 'usdc_base'],
      usdc_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      payment_wallet: '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee',
      network: 'base (chainId 8453)',
      dispute_window: '7 days',
    },
    
    // Agent discovery
    discovery: {
      agent_card: '/.well-known/agent.json',
      mcp_discovery: '/.well-known/mcp.json',
      ai_plugin: '/.well-known/ai-plugin.json',
      llms_txt: '/llms.txt',
      llms_full_txt: '/llms-full.txt',
    },
    
    timestamp: new Date().toISOString(),
  });
});
