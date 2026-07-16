[![GitHub stars](https://img.shields.io/github/stars/edgarfloresguerra2011-a11y/marketnow?style=social)](https://github.com/edgarfloresguerra2011-a11y/marketnow)
[![npm downloads](https://img.shields.io/npm/dw/marketnow-mcp)](https://www.npmjs.com/package/marketnow-mcp)
[![License: AliceLabs LLC Proprietary](https://img.shields.io/badge/License-Proprietary-red)](https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/LICENSE)
[![Sentinel L2.5](https://img.shields.io/badge/Sentinel-L2.5%20gVisor%20sandbox-00F299)](https://marketnow.site/security)

# MarketNow — Trust Layer for Agent Commerce

> ⭐ **If MarketNow is useful to you, please star the repo. It helps other developers discover it.**

> **8,764 MCP servers. Each Sentinel-audited with 6 layers (L1.5 → L2.5 gVisor sandbox). Signed SHA-256 certificates. Public verification at marketnow.site/verify.**

<!-- CANONICAL METADATA — for crawlers and directories that scrape this README.
     If you are maintaining an external directory listing for MarketNow,
     use these values as the source of truth. Last updated: 2026-07-06. -->

| Field | Value |
|---|---|
| **Name** | MarketNow |
| **Tagline** | Trust layer for agent commerce — every skill Sentinel-certified |
| **Description** | MarketNow is the first MCP marketplace with security certification. Every one of 8,764 MCP servers is audited by Sentinel (6-layer pipeline: L1.5 metadata + L1.6 Semgrep/secrets/OSV + L2 active probe + L2.5 gVisor sandbox) and gets a signed SHA-256 certificate, publicly verifiable at marketnow.site/verify. B2B pricing: Community (Free) / Team ($99/mo) / Enterprise (Custom). AliceLabs LLC proprietary, maintained by AliceLabs LLC (Wyoming, USA). |
| **Total skills** | 8,764 |
| **Certified skills** | 8,764 (100%) |
| **Free skills** | 65 |
| **Categories** | 23 |
| **Pricing** | B2B: Community (Free) / Team ($99/mo, COMING SOON) / Enterprise (Custom) |
| **Payment methods** | Stripe (credit card) + USDC on Base |
| **Languages** | EN, ES, ZH, PT, FR |
| **License** | AliceLabs LLC Proprietary |
| **Maintainer** | AliceLabs LLC (Wyoming, USA) — founder Edison Flores |
| **MCP server** | `npx -y marketnow-mcp` |
| **npm** | https://www.npmjs.com/package/marketnow-mcp |
| **GitHub** | https://github.com/edgarfloresguerra2011-a11y/marketnow |
| **Website** | https://marketnow.site |
| **Verify certificate** | https://marketnow.site/verify |
| **Transparency dashboard** | https://marketnow.site/sentinel-transparency |
| **API docs** | https://marketnow.site/api/agent.json |
| **Standards** | x402 (implementing), AP2 (implementing), MCP Server Cards (monitoring) |
| **Sentinel layers** | L1.5 (6 metadata checks) + L1.6 (18 Semgrep rules + 18 secret patterns + OSV API) + L2 v2.0 (active MCP probe, 60+ adversarial inputs) + L2.5 (gVisor sandbox: --runtime=runsc, userspace kernel) + L3 (Firecracker microVM, Q1 2027) + L4 (supply chain attestation, Q4 2026) + L5 (third-party audit, Q3 2027) |

<!-- END CANONICAL METADATA -->

[![npm version](https://img.shields.io/npm/v/marketnow-mcp.svg)](https://www.npmjs.com/package/marketnow-mcp)
[![License: AliceLabs LLC Proprietary](https://img.shields.io/badge/License-Proprietary-red)](https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/LICENSE)
[![Sentinel Certified](https://img.shields.io/badge/🛡️_Sentinel-Certified%208%2C582-00F299)](https://marketnow.site/sentinel-transparency)

## 🤖 What is MarketNow?

MarketNow is the open marketplace for MCP-compatible agent skills. It allows any agent (Claude Desktop, Cursor, Cline, VS Code) to search, discover, and install **Sentinel-certified** skills via the Model Context Protocol.

**The code is open source. What you pay for is trust, certification, and integration.**

## 🛡️ Sentinel Certification

Every skill in MarketNow is audited by Sentinel, a 6-layer security pipeline:

### L1.5 — Metadata Checks (real-time, ~200ms on Vercel)
- AUTH (does the server require authentication?)
- Tool description injection (prompt injection patterns)
- Input validation (fs/db/http access detection)
- CORS policy
- OAuth scopes
- Rate limiting + error leakage

### L1.6 — Static Analysis (real-time + weekly batch)
- 18 Semgrep-equivalent rules (prompt injection, command injection, SSRF, path traversal, tool forgery)
- 18 secret patterns (Stripe, AWS, GitHub, JWT, private keys, wallet mnemonics)
- OSV API real-time dependency vulnerability check

### L2 v2.0 — Active MCP Probe + Docker Sandbox (async via GitHub Actions)

L2.5 adds gVisor (runsc) userspace kernel isolation on top of Docker. The MCP server never touches the host kernel.
Runs the actual MCP server in isolation:
```bash
docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --memory 256m --cpus 0.5 \
  mcp-audit-target
```
Analyzes stdout for: network attempts, fs writes, process spawns, credential leakage, crashes, dynamic imports.

### Results (live at [marketnow.site/sentinel-transparency](https://marketnow.site/sentinel-transparency))

| Risk Level | Count | Score |
|---|---|---|
| Low | 6 | 10/10 |
| Medium | 8,473 | 6-9/10 |
| High | 92 | 2-4/10 |
| Critical | 11 | 0-1/10 |

**L2 coverage**: 206 of 8,764 skills have L2.5 gVisor sandbox results. The remaining 8,558 are certified with L1.5+L1.6 (static analysis). L2 coverage grows weekly via automated GitHub Actions.

Each skill gets a **signed SHA-256 certificate** with:
- `certificate_id` (MN-SC-2026-XXXXXXX)
- `overall_score` (0-10)
- `risk_level` (low/medium/high/critical)
- 7-day validity (regenerated weekly by GitHub Actions cron)

**Verify any certificate**: https://marketnow.site/verify
**Transparency dashboard**: https://marketnow.site/sentinel-transparency
**All certificates**: [_data/sentinel_certificates/](./_data/sentinel_certificates/)

### Markdown Badges

Skill authors can embed a certified badge in their READMEs:
```markdown
[![Sentinel Certified](https://marketnow.site/badges/sentinel-certified-mn-gen-00003.svg)](https://marketnow.site/skill/mn-gen-00003)
```

## 📊 Stats

| Metric | Value |
|---|---|
| Total skills | 8,764 |
| Certified skills | 8,764 (100%) |
| Categories | 61 |
| Free skills | 65 |
| L2.5 sandbox runs | 206 |
| Languages | EN, ES, ZH, PT, FR |
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
- Search 8,764 certified skills by query, category, or language
- Get full skill details with system prompts and Sentinel security reports
- Verify any skill's signed certificate
- Get install commands for any skill

### Verify a Certificate

```bash
# Check any skill's certificate via API
curl "https://marketnow.site/api/audit-skill?certificate=1&skillId=mn-gen-00003" | jq

# Or verify visually at:
# https://marketnow.site/verify?skillId=mn-gen-00003
```

### Search Skills

```bash
# Search for web scrapers
curl "https://marketnow.site/api/search?q=scrape" | jq

# Search in Chinese
curl "https://marketnow.site/api/search?q=数据库&language=zh" | jq
```

## 💰 Business model — Sentinel is the product, not skills

**MarketNow does NOT sell skills.** We administer a free marketplace of 8,764 MCP servers. All skills are free to install and use.

Our product is **Sentinel** — the 8-layer security audit pipeline. Pricing:

| Tier | Price | What you get |
|---|---|---|
| **Community** | FREE | Browse all 8,764 skills, install via `npx`, basic Sentinel certificate per skill |
| **Team** | $99/mo | Continuous monitoring, analytics dashboard, team mandates, priority L2 sandbox audits |
| **Enterprise** | Custom | Self-hosted Sentinel, private catalog, custom malware family signatures, SLA, on-prem deployment |

**Seller program (optional):** Third-party developers can sell THEIR skills on MarketNow. They set the price, we facilitate payment (USDC on Base + mandates), and take **5% commission**. Sellers must pass Sentinel audit before listing. Sign up at `/sell`.

## 📡 Public API (no auth required)

| Endpoint | Description |
|---|---|
| `GET /api/skills.json` | All 8,764 skills (bulk download) |
| `GET /api/search?q=query` | Server-side search with relevance scoring |
| `GET /api/free-skills.json` | 65 free skills |
| `GET /api/categories.json` | 61 categories with counts |
| `GET /api/manifest.json` | Marketplace metadata |
| `GET /api/agent.json` | Machine-readable agent instructions |
| `POST /api/audit-skill` | Run Sentinel L1.5+L1.6+L2+L2.5 real-time audit |
| `GET /api/audit-skill?certificate=1&skillId=X` | Retrieve signed Sentinel certificate |
| `GET /api/audit-skill?sentinel-status=1` | Aggregate Sentinel status (batch audit + L2 coverage + certified count) |
| `GET /api/verify-purchase?sessionId=X` | Verify a Stripe purchase |
| `GET /.well-known/mcp/server-card.json` | MCP server discovery |

## 🔧 MCP Server Tools

| Tool | Description |
|---|---|
| `search_skills` | Search by query, category, language |
| `get_skill` | Get full details (system prompt, sentinel, setup) |
| `list_categories` | List all 61 categories |
| `get_manifest` | Marketplace metadata |
| `get_install_command` | Get npx install command |

## 🔗 Links

- **Website**: https://marketnow.site
- **Verify a certificate**: https://marketnow.site/verify
- **Transparency dashboard**: https://marketnow.site/sentinel-transparency
- **Security details**: https://marketnow.site/security
- **npm**: https://www.npmjs.com/package/marketnow-mcp
- **Smithery**: https://smithery.ai/servers/eddyflores100/marketnow
- **OpenAPI**: https://marketnow.site/api/openapi.json
- **Agent instructions**: https://marketnow.site/api/agent.json

## 📜 License & IP Protection

**ALL code in this repository is PROPRIETARY — property of AliceLabs LLC.**

| Component | License | Can copy? | Can build competing product? | Can commercialize? |
|-----------|---------|-----------|------------------------------|-------------------|
| **Marketplace code** (UI, API, search) | AliceLabs LLC Proprietary | ❌ No | ❌ No | ❌ Requires written permission |
| **Sentinel audit engine** | AliceLabs LLC Proprietary | ❌ No | ❌ No | ❌ Requires written permission |
| **Sentinel badges** (SVG) | CC-BY 4.0 (display only) | ✅ Display only | ❌ No | ❌ No |
| **"Sentinel" name & logo** | Trademark™ AliceLabs LLC | ❌ No | ❌ No | ❌ No |
| **"MarketNow" name** | Trademark™ AliceLabs LLC | ❌ No | ❌ No | ❌ No |

**Anyone who wants to commercialize, redistribute, or build upon any part of this codebase MUST obtain written permission from AliceLabs LLC.**

See:
- [LICENSE](./LICENSE) — Full license terms (Proprietary)
- [SENTINEL-LICENSE](./SENTINEL-LICENSE) — Sentinel proprietary license terms
- [TRADEMARK_NOTICE](./TRADEMARK_NOTICE) — Trademark usage guidelines
- [CLA](./CLA) — Contributor License Agreement

**Patent pending** on the 6-layer audit pipeline design (L1.5 → L1.6 → L2 → L2.5 → L3 → L4 → L5).

For licensing inquiries: **legal@alicelabs.site**
For support: **support@alicelabs.site**
General inquiries: **info@alicelabs.site**

Report IP violations: **legal@alicelabs.site**

---

**Built for autonomous agents. Every skill has a signed Sentinel certificate, a ready-to-use system prompt, and auto-configured install. ALL code is proprietary property of AliceLabs LLC. Commercial use requires written permission.**
