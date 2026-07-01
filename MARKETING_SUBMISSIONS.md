# MarketNow — Global MCP Directory Submission Plan

This document contains:
1. Complete list of MCP directories worldwide (US, China, Europe)
2. Pre-written submission emails/PRs you can copy-paste
3. Status tracking for each directory

## Current Listings (verified)

| # | Directory | Country | URL | Status | Action Needed |
|---|---|---|---|---|---|
| 1 | mcp.so | US | https://mcp.so/server/marketnow-mcp---aep-agent-exchange-protocol/edgarfloresguerra2011-a11y | ✅ Listed (data OUTDATED) | Email them to update |
| 2 | chat.mcp.so | US | https://chat.mcp.so/server/marketnow-mcp---aep-agent-exchange-protocol/edgarfloresguerra2011-a11y | ✅ Listed (mirror) | Updates with mcp.so |
| 3 | glama.ai | US | https://glama.ai/mcp/connectors?query=MarketNow+MCP | ✅ Listed | Verify data is current |
| 4 | npm | US | https://www.npmjs.com/package/marketnow-mcp | ✅ Published v1.0.1 | Auto-updates on publish |

## Directories to Submit To

### Tier 1 — Official / High Authority

| # | Directory | Country | URL | How to Submit |
|---|---|---|---|---|
| 5 | MCP Registry (official) | US | https://registry.modelcontextprotocol.io | PR to https://github.com/modelcontextprotocol/registry |
| 6 | Anthropic MCP Servers (official) | US | https://github.com/modelcontextprotocol/servers | PR to add to README |
| 7 | GitHub MCP Registry | US | https://github.blog/ai-and-ml/github-copilot/meet-the-github-mcp-registry | Via GitHub Copilot settings |
| 8 | JFrog Universal MCP Registry | US/IL | https://investors.jfrog.com/2026/JFrog-Unveils-Universal-MCP-Registry | Contact JFrog |

### Tier 2 — Major Directories

| # | Directory | Country | URL | How to Submit |
|---|---|---|---|---|
| 9 | Smithery | US | https://smithery.ai | Sign up → Submit server |
| 10 | Awesome MCP Servers (mcpservers.org) | US | https://mcpservers.org | PR to their GitHub repo |
| 11 | MCP Market | US | https://mcpmarket.com/sell | Form on /sell page |
| 12 | MCP.Directory | US | https://mcp.directory | Submit form |
| 13 | MCPBundles | US | https://www.mcpbundles.com | Contact via site |
| 14 | MCPManager | US | https://mcpmanager.ai | Contact via site |
| 15 | Cursor Marketplace | US | https://cursor.com/marketplace | Apply as plugin developer |
| 16 | Composio | US/IN | https://composio.dev | List as alternative |
| 17 | TrueFoundry | US | https://www.truefoundry.com | Contact for listing |

### Tier 3 — Chinese Directories (massive market)

| # | Directory | Country | URL | How to Submit |
|---|---|---|---|---|
| 18 | MCP Hub China (mcp-cn.com) | China | https://mcp-cn.com | 提交服务 (Submit service) |
| 19 | ModelScope MCP 广场 | China | https://www.modelscope.cn/mcp | Alibaba's MCP hub — submit via ModelScope account |
| 20 | Awesome-MCP-ZH | China | https://github.com/yzfly/awesome-mcp-zh | PR to GitHub repo (Chinese) |
| 21 | Fit2Cloud Hub | China | https://bbs.fit2cloud.com/t/topic/12752 | Post in their community |
| 22 | Zhihu (MCP navigation) | China | https://zhuanlan.zhihu.com/p/2036834950998127996 | Article on Zhihu (China's Quora) |

### Tier 4 — European / Other

| # | Directory | Country | URL | How to Submit |
|---|---|---|---|---|
| 23 | Higress MCP Marketplace | EU/China | https://mcp.higress.ai | Submit via their site |
| 24 | XPack MCP Marketplace | EU | https://github.com/xpack-ai/XPack-MCP-Marketplace | PR to GitHub repo |
| 25 | Syncfusion MCP Marketplace | EU | https://help.syncfusion.com/code-studio/reference/configure-properties/mcp/marketplace | Contact Syncfusion |

### Tier 5 — Awesome Lists / Aggregators

| # | Directory | Country | URL | How to Submit |
|---|---|---|---|---|
| 26 | Awesome MCP Servers (patriksimek) | CZ | https://github.com/patriksimek/awesome-mcp-servers-2 | PR to GitHub repo |
| 27 | Awesome MCP (abordage) | EU | https://github.com/abordage/awesome-mcp | PR to GitHub repo |
| 28 | Awesome MCP Devtools | US | https://github.com/punkpeye/awesome-mcp-devtools | PR to GitHub repo |
| 29 | Reddit r/mcp | US | https://www.reddit.com/r/mcp | Post in community |
| 30 | Reddit r/ClaudeAI | US | https://www.reddit.com/r/ClaudeAI | Post in community |

## Pre-Written Submission Content

### Standard Description (for all directories)

```
**MarketNow** — The open marketplace for MCP-compatible agent skills.

🔗 URL: https://marketnow.site
📦 npm: marketnow-mcp (https://www.npmjs.com/package/marketnow-mcp)
💻 GitHub: https://github.com/edgarfloresguerra2011-a11y/marketnow
🔌 MCP Server: npx -y marketnow-mcp
📖 Discovery: https://marketnow.site/.well-known/mcp.json
🤖 Agent API: https://marketnow.site/api/agent.json

**Stats:**
- 5,054 verified MCP skills
- 25 categories
- $0.99-$9.99 per skill (one-time payment)
- Average price: $2.50
- All skills scanned by Sentinel L1 (security audit)
- Human-reviewed before listing

**Features:**
- Micro-priced for autonomous agent consumption
- Public JSON API (no auth required for reads)
- MarketNow is itself an installable MCP server (5 tools)
- Affiliate program (5% commission)
- Seller tiers: FREE (3 skills) / PRO ($9.99/mo) / ENTERPRISE ($49.99/mo)
- Skill submission portal with Sentinel pre-scan
- AI skill matcher (natural language search)

**MCP Config (Claude Desktop / Cursor / Cline):**
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "marketnow-mcp"]
    }
  }
}

**Tools exposed:**
- search_skills: Search by query, category, max price
- get_skill: Get full details by ID or slug
- list_categories: All 25 categories with counts
- get_manifest: Marketplace metadata
- get_install_command: Get install command for a skill

**License:** MIT
```

### Email Template — For mcp.so (Update Request)

**To:** support@mcp.so (or via their contact form)
**Subject:** Update MarketNow listing — outdated data (13K → 5K skills)

```
Hi mcp.so team,

I'm the maintainer of MarketNow (https://mcp.so/server/marketnow-mcp---aep-agent-exchange-protocol/edgarfloresguerra2011-a11y).

Our listing on mcp.so has outdated data. Could you please update it?

Current (OUTDATED):
- "13,859 verified MCP-compatible skills"
- "Crypto payments (ETH/BSC/SOL/BTC)"
- "Badge ecosystem"
- "SSR Pages"
- "Transport: SSE/WebSocket/JSON-RPC"
- Config: "url": "https://marketnow.site/api/mcp"

Correct (CURRENT):
- "5,054 verified MCP-compatible skills" (we removed synthetic entries)
- "USD/USDC payments via Stripe" (no multi-chain crypto)
- No badge ecosystem (removed)
- SPA on GitHub Pages (no SSR)
- "Transport: stdio only" (via npx marketnow-mcp)
- Config: {"mcpServers":{"marketnow":{"command":"npx","args":["-y","marketnow-mcp"]}}}

You can verify all current data at:
- https://marketnow.site/.well-known/mcp.json (standardized discovery)
- https://marketnow.site/api/mcp.json (server metadata)
- https://marketnow.site/api/agent.json (full agent instructions)
- https://www.npmjs.com/package/marketnow-mcp (npm package)

npm package: marketnow-mcp@1.0.1
GitHub: https://github.com/edgarfloresguerra2011-a11y/marketnow

Thanks for maintaining mcp.so — it's a great resource for the MCP community!

Best,
Edgar Flores
eddyflores100@gmail.com
```

### Email Template — For new directory submissions

**Subject:** MarketNow submission — 5,054 MCP skills marketplace

```
Hi [Directory Name] team,

I'd like to submit MarketNow to your MCP directory.

**MarketNow** is the open marketplace for MCP-compatible agent skills.
We have 5,054 verified skills across 25 categories, micro-priced from
$0.99 to $9.99 (one-time payment, no subscriptions).

Stats:
- 5,054 verified skills (all Sentinel L1 scanned)
- 25 categories
- $0.99-$9.99 per skill (avg $2.50)
- Public JSON API at /api/skills.json
- MarketNow is itself an installable MCP server: npx -y marketnow-mcp

URLs:
- Website: https://marketnow.site
- npm: https://www.npmjs.com/package/marketnow-mcp
- GitHub: https://github.com/edgarfloresguerra2011-a11y/marketnow
- Discovery: https://marketnow.site/.well-known/mcp.json
- MCP config:
  {
    "mcpServers": {
      "marketnow": {
        "command": "npx",
        "args": ["-y", "marketnow-mcp"]
      }
    }
  }

Tools exposed by the MCP server:
1. search_skills — Search by query, category, max price
2. get_skill — Get full details by ID or slug
3. list_categories — All 25 categories with counts
4. get_manifest — Marketplace metadata
5. get_install_command — Get install command for a skill

License: MIT

Please let me know if you need any additional information.

Best,
Edgar Flores
eddyflores100@gmail.com
```

### Chinese Submission Template (中文)

**Subject:** MarketNow 提交 — MCP 技能市场

```
您好,

我想将 MarketNow 提交到您的 MCP 目录.

MarketNow 是 MCP 兼容代理技能的开放市场.
我们拥有 5,054 个经过验证的技能, 覆盖 25 个类别,
价格从 $0.99 到 $9.99 (一次性付款, 无订阅).

统计:
- 5,054 个经过验证的技能 (全部通过 Sentinel L1 扫描)
- 25 个类别
- 每个技能 $0.99-$9.99 (平均 $2.50)
- 公共 JSON API: /api/skills.json
- MarketNow 本身也是一个可安装的 MCP 服务器: npx -y marketnow-mcp

链接:
- 网站: https://marketnow.site
- npm: https://www.npmjs.com/package/marketnow-mcp
- GitHub: https://github.com/edgarfloresguerra2011-a11y/marketnow
- 发现: https://marketnow.site/.well-known/mcp.json

MCP 配置:
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "marketnow-mcp"]
    }
  }
}

许可证: MIT

如果您需要任何其他信息, 请告诉我.

此致,
Edgar Flores
eddyflores100@gmail.com
```

### GitHub PR Template (for awesome-mcp repos)

````markdown
## Add MarketNow — MCP skill marketplace with 5,054+ skills

This PR adds [MarketNow](https://marketnow.site), an open marketplace for MCP-compatible agent skills.

### Why this should be included

MarketNow is unique among MCP servers because:
1. **It's a marketplace, not a single tool** — 5,054 verified skills from many authors
2. **Micro-priced for autonomous agents** — $0.99 to $9.99 per skill, one-time payment
3. **Itself an MCP server** — `npx -y marketnow-mcp` exposes 5 tools for searching the marketplace
4. **Sentinel L1 security scanning** — every submission is automatically audited
5. **Public JSON API** — `/api/skills.json` returns the full catalog for agent consumption

### Stats
- 5,054 verified skills
- 25 categories (AI/ML, Data, Security, DevOps, etc.)
- $0.99–$9.99 per skill (avg $2.50)
- 100% open-source skills (sourced from real GitHub repos)
- MIT license

### MCP Config
```json
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "marketnow-mcp"]
    }
  }
}
```

### Links
- Website: https://marketnow.site
- npm: https://www.npmjs.com/package/marketnow-mcp
- GitHub: https://github.com/edgarfloresguerra2011-a11y/marketnow
- API: https://marketnow.site/api/agent.json
- Discovery: https://marketnow.site/.well-known/mcp.json

### Tools Exposed
1. `search_skills` — Search by query, category, max price
2. `get_skill` — Get full details by ID or slug
3. `list_categories` — All 25 categories with counts
4. `get_manifest` — Marketplace metadata
5. `get_install_command` — Get install command for a skill
````

### Reddit Post Template (r/mcp)

**Title:** MarketNow — 5,054 MCP skills marketplace with micro-pricing ($0.99-$9.99), now with its own MCP server

**Body:**
```
Hey r/mcp — I built MarketNow, an open marketplace for MCP-compatible
agent skills. Every skill is sourced from a real GitHub repo and
verified by Sentinel L1 before listing.

**Stats:**
- 5,054 verified skills
- 25 categories
- $0.99–$9.99 per skill (one-time, no subscriptions)
- Average price: $2.50

**What's unique:**
1. MarketNow is itself an installable MCP server — `npx -y marketnow-mcp`
   gives your agent 5 tools to search the marketplace from inside Claude,
   Cursor, or Cline.
2. Micro-pricing designed for autonomous agent consumption — agents can
   buy skills without human intervention.
3. Public JSON API at /api/skills.json (no auth required).
4. Sentinel L1 security scan on every submission (repo, README, license,
   secrets, malicious patterns).
5. Seller tiers: FREE (3 skills) / PRO ($9.99/mo) / ENTERPRISE ($49.99/mo).

**Try it:**
- Browse: https://marketnow.site/registry
- Install MCP server: `npx -y marketnow-mcp`
- Submit your skill: https://marketnow.site/submit
- API docs: https://marketnow.site/api/agent.json

Would love feedback from the community!
```

## Anthropic / Google / OpenAI — Clarification

You mentioned being "listed in Anthropic, Google, GPT". To clarify:

- **Anthropic** doesn't have a public directory, but they maintain the official
  MCP servers list at https://github.com/modelcontextprotocol/servers — submit
  a PR there to be officially listed by Anthropic.
- **Google** doesn't have an MCP directory. Vertex AI Agent Builder uses MCP
  but doesn't list third-party servers publicly.
- **OpenAI** doesn't support MCP natively in ChatGPT (as of mid-2026). When
  they do, MarketNow will be ready since we already have the MCP server.

The "listings" in Anthropic/Google/OpenAI ecosystems happen via:
1. Official MCP servers repo (Anthropic)
2. Documentation mentions
3. Partnerships (requires business development)

## Action Plan (Priority Order)

### Week 1 — Quick wins
1. ✅ Email mcp.so to update outdated listing (use template above)
2. ✅ Submit to Smithery (sign up + form)
3. ✅ PR to modelcontextprotocol/servers (official Anthropic list)
4. ✅ PR to modelcontextprotocol/registry (official registry)
5. ✅ PR to yzfly/awesome-mcp-zh (Chinese audience)
6. ✅ Submit to mcpmarket.com/sell
7. ✅ Post on r/mcp and r/ClaudeAI

### Week 2 — Chinese expansion
8. ✅ Submit to mcp-cn.com
9. ✅ Submit to ModelScope MCP 广场 (Alibaba)
10. ✅ Article on Zhihu (Chinese Quora)
11. ✅ PR to patriksimek/awesome-mcp-servers-2
12. ✅ PR to abordage/awesome-mcp

### Week 3 — European + enterprise
13. ✅ Contact Higress
14. ✅ Contact JFrog (Universal MCP Registry)
15. ✅ Contact Syncfusion
16. ✅ Submit to MCP.Directory
17. ✅ Submit to MCPBundles

### Ongoing
- Monitor each directory for accuracy
- Re-submit when major updates happen
- Track inbound traffic from each directory
