![smithery badge](https://smithery.ai/badge/eddyflores100/marketnow)](https://smithery.ai/servers/eddyflores100/marketnow)
[![License: MNNC-1.0](https://img.shields.io/badge/License-MNNC--1.0-red)](./LICENSE)

# MarketNow — Trust Layer for Agent Commerce

> **8,560 MCP-compatible skills. 43 are FREE. Sentinel L1.5 security audit on every skill. AP2-compatible mandates. x402 payments. Human-in-the-loop by default.**

<!-- CANONICAL METADATA — for crawlers and directories that scrape this README.
     If you are maintaining an external directory listing for MarketNow,
     use these values as the source of truth. Last updated: 2026-07-02. -->

| Field | Value |
|---|---|
| **Name** | MarketNow |
| **Tagline** | Trust layer for agent commerce |
| **Description** | Trust layer for agent commerce. Discovery is solved (MCP registry, Smithery, Glama); trust is not. MarketNow provides Sentinel security audits, AP2-compatible mandates, x402 payments, and human-in-the-loop-by-default agent spending. 8,560 MCP servers, $0.99-$9.99 one-time, 43 free. Open source MIT, maintained by AliceLabs LLC. |
| **Total skills** | 8,560 |
| **Free skills** | 43 |
| **Categories** | 58 |
| **Price range** | $0.99 - $9.99 (one-time, no subscriptions) |
| **Payment methods** | USDC on Base (x402 protocol) + Stripe (credit card) |
| **Languages** | EN, ES, ZH, PT, FR |
| **License** | MIT |
| **Maintainer** | AliceLabs LLC (Ecuador) — founder Edison Flores |
| **MCP server** | `npx -y marketnow-mcp` |
| **npm** | https://www.npmjs.com/package/marketnow-mcp |
| **GitHub** | https://github.com/edgarfloresguerra2011-a11y/marketnow |
| **Website** | https://marketnow.site |
| **API docs** | https://marketnow.site/api/agent.json |
| **Standards** | x402 (implementing), AP2 (implementing), MCP Server Cards (monitoring) |
| **Review status** | 8,517 auto-scanned · 43 human-reviewed · 0 maintainer-verified |
| **NOT** | "largest MCP marketplace" (we are the trust layer, not the largest) · "no humans needed" (human-in-loop is default) · "ETH/BSC/SOL/BTC payments" (USDC on Base only) |

<!-- END CANONICAL METADATA -->

[![npm version](https://img.shields.io/npm/v/marketnow-mcp.svg)](https://www.npmjs.com/package/marketnow-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Smithery](https://img.shields.io/badge/Smithery-84%2F100-orange)](https://smithery.ai/servers/eddyflores100/marketnow)

## 🤖 What is MarketNow?

MarketNow is the open marketplace for MCP-compatible agent skills. It allows any agent (Claude Desktop, Cursor, Cline, VS Code) to search, discover, and install verified skills via the Model Context Protocol.

**The code is open source. What you pay for is trust, curation, and integration.**

## 📊 Stats

| Metric | Value |
|---|---|
| Total skills | 8,560 |
| Categories | 58 |
| Price range | $0.99 - $9.99 (one-time) |
| Free skills | 43 |
| Languages | EN, ES, ZH, PT, FR |
| Active sellers | 15 |
| MCP server tools | 5 |

## 🚀 Quick Start

### Install MCP Server (Claude Desktop, Cursor, Cline)

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

Now your agent can:
- Search 8,560 skills by query, category, price, or language
- Get full skill details with system prompts and Sentinel security reports
- Get install commands for any skill

### Get 43 FREE Skills

```bash
curl https://marketnow.site/api/free-skills.json | jq ".skills[0]"
```

### Search Skills

```bash
# Search for web scrapers under $3
curl "https://marketnow.site/api/search?q=scrape&max_price=3" | jq

# Search in Chinese
curl "https://marketnow.site/api/search?q=数据库&language=zh" | jq
```

## 🛡️ What makes MarketNow different?

### 1. Sentinel Security Reports
Every skill is scanned. You see exactly what passed, what warned, and what failed:
```json
{
  "score": 8,
  "passed": ["no_prompt_injection", "no_credential_access", "no_obfuscation", ...],
  "warnings": ["external_fetch_detected"],
  "failed": [],
  "summary": "Passed 8/8 critical checks, 1 warning"
}
```

### 2. Ready-to-Use System Prompts
Every skill includes a specific system prompt with:
- When to Use (category-specific context)
- Rules (5 actionable rules per skill)
- Input/Output format
- Usage Example (Python code)
- Capabilities (actions, auth, network requirements)

### 3. Setup Requirements
Know exactly what you need BEFORE buying:
```json
{
  "required_env": ["OUTSCRAPER_API_KEY"],
  "api_key_url": "https://app.outscraper.com/api-keys",
  "estimated_cost": "pay-per-use"
}
```

### 4. 5-Language Support
Every skill with a system prompt has translations in:
- 🇺🇸 English
- 🇪🇸 Español
- 🇨🇳 中文
- 🇧🇷 Português
- 🇫🇷 Français

### 5. Skill Bundles
Buy curated packs with 40-84% savings:
- 🕷️ Web Intelligence Pack — $5.99 (save 40%)
- 🛡️ Agent Safety Pack — $7.99 (save 84%)
- 🔄 DevOps Power Pack — $9.99 (save 80%)

## 📡 Public API (no auth required)

| Endpoint | Description |
|---|---|
| `GET /api/skills.json` | All 8,560 skills (bulk download) |
| `GET /api/search?q=query` | Server-side search with relevance scoring |
| `GET /api/free-skills.json` | 43 free skills |
| `GET /api/categories.json` | 58 categories with counts |
| `GET /api/manifest.json` | Marketplace metadata |
| `GET /api/agent.json` | Machine-readable agent instructions |
| `GET /api/openapi.yaml` | OpenAPI 3.1 specification |
| `GET /api/bundles.json` | Skill bundles with discounts |
| `GET /api/verify-purchase?sessionId=X` | Verify a Stripe purchase |
| `GET /.well-known/mcp/server-card.json` | MCP server discovery |
| `GET /.well-known/mcp.json` | MCP server metadata |

## 🔧 MCP Server Tools

| Tool | Description |
|---|---|
| `search_skills` | Search by query, category, price, language |
| `get_skill` | Get full details (system prompt, sentinel, setup) |
| `list_categories` | List all 58 categories |
| `get_manifest` | Marketplace metadata |
| `get_install_command` | Get npx install command |

## 💰 Pricing

- **Buyers**: $0.99-$9.99 per skill (one-time, no subscriptions)
- **Sellers**: FREE (3 skills) / PRO $9.99/mo (25 skills) / ENTERPRISE $49.99/mo (unlimited)
- **Commission**: 20% MarketNow, 80% seller
- **Affiliate**: 5% commission on referred sales

## 🔗 Links

- **Website**: https://marketnow.site
- **npm**: https://www.npmjs.com/package/marketnow-mcp
- **Smithery**: https://smithery.ai/servers/eddyflores100/marketnow
- **mcp.so**: https://mcp.so/server/marketnow-mcp---aep-agent-exchange-protocol/edgarfloresguerra2011-a11y
- **OpenAPI**: https://marketnow.site/api/openapi.yaml
- **Agent instructions**: https://marketnow.site/api/agent.json

## 📜 License

MIT — The marketplace code is open source. Individual skills retain their original licenses.

---

**Built for autonomous agents. Every skill has a Sentinel security report, a ready-to-use system prompt, and auto-configured install. The code is open source. What you pay for is trust, curation, and integration.**
