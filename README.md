# MarketNow — Trust Infrastructure for AI Agents

> **Repo ecosystem (one owner per concern, split 2026-09-26):**
>
> | Repo | Sole owner of |
> |------|----------------|
> | `alicelabs-llc/MARKETNOW` (this repo) | Product code: `mcp-server` (npm `marketnow-mcp`), `atc-sdk`/`atc-python`/`atc-rust`, Docker/Cline/Cursor integrations, CLIs, security audits |
> | `eddyflores100-lang/marketnow` | Live marketplace: site (`aep-marketplace/`), catalog data (`_data/`, `skills/`, `public/api/`), the 21 scheduled data pipelines, Vercel deploys of marketnow.site |
> | `alicelabs-llc/universal-trust-adapter` | ATC/1.0 protocol: spec, adapters, reference implementation, plugins |
> | `alicelabs-llc/marketnow-submissions` | Public skill submissions queue |
> | `alicelabs-llc/status` | Live status page |
>
> Data and site questions go to the marketplace repo; protocol questions to UTA; everything else lives here.

> **MarketNow doesn't sell AI tools. It determines whether AI agents should be allowed to trust and execute them.**

[![npm version](https://img.shields.io/npm/v/marketnow-mcp)](https://www.npmjs.com/package/marketnow-mcp)
[![npm downloads](https://img.shields.io/npm/dw/marketnow-mcp)](https://www.npmjs.com/package/marketnow-mcp)
[![License: AliceLabs LLC Proprietary](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## What is MarketNow?

MarketNow is **trust infrastructure for AI agents**: a hosted registry that verifies skills, credentials and domains across **68,388 indexed MCP servers** (132,737 tracked across GitHub, npm and PyPI), with signed skill submissions, revocation checks and a 9-tool MCP API.

Every indexed entry is security-first scored. The MCP API is **free** — 68,387 of the 68,388 indexed servers are free to install (`paid: 1` in the public [stats API](https://www.marketnow.site/api/stats.json)).

## The 9 MCP tools (endpoint v1.15.0)

> Endpoint tracks the npm train: **v1.15.0** (2026-09-26 — repository-field repair → `alicelabs-llc/MARKETNOW`, npm ↔ endpoint lockstep); previously v1.14.1 (2026-09-20).

The MCP server exposes 9 tools, all under the `marketnow_*` namespace so Claude Desktop, Cursor, Cline, LangChain and LlamaIndex can disambiguate them at tool-choice time:

| # | Tool | What it does |
|---|------|--------------|
| 1 | `marketnow_verify_trust` | Verify any AI-agent credential (JWT, W3C VC, MCP Card, ATC v3, A2A, EAT-AI, ZTA, X.509) through the UTA 12-stage verification pipeline |
| 2 | `marketnow_translate_credential` | Translate a credential between 8 formats (ATC v3, JWT, W3C VC, A2A, EAT-AI, ZTA, MCP Card, X.509) losslessly via the Universal Trust Schema |
| 3 | `marketnow_list_formats` | List the 8 supported credential formats with their algorithms and status |
| 4 | `marketnow_get_pipeline` | Get the 12-stage verification pipeline details |
| 5 | `marketnow_check_domain` | Scam checker: returns a domain risk score with reasons |
| 6 | `marketnow_search_skills` | Search the registry of indexed MCP servers (GitHub, npm, PyPI), security-first scored |
| 7 | `marketnow_check_revocation` | Check revocation of an Agent Trust Card or CA key against the signed Revocation Registry (MNR-CRL-1.0) + live ledger |
| 8 | `marketnow_fingerprint_tool` | Cryptographically fingerprint MCP tool definitions (OWASP MCP Cheat Sheet) with RFC 8785 JCS + SHA-256 |
| 9 | `marketnow_submit_skill` | Publish a skill to the catalog: validated and Sentinel-scanned (injection patterns, embedded secrets, dangerous capabilities) |

Tool contract: deterministic `marketnow_` snake_case names · intent-oriented descriptions · strict JSON-Schema parameters · structured `{ content, isError }` responses.

## Quick start

### Connect any MCP client (Streamable HTTP)
```json
{
  "mcpServers": {
    "marketnow": {
      "url": "https://www.marketnow.site/api/mcp"
    }
  }
}
```

### Run the MCP server
```bash
npx -y marketnow-mcp
```

### Run it in Docker (audited repo tree, published by CI)
```bash
docker run -i --rm ghcr.io/alicelabs-llc/marketnow-mcp:1.15.0
# or register it in the Docker MCP Toolkit:
docker mcp gateway add --docker ghcr.io/alicelabs-llc/marketnow-mcp
```

### Cline
Paste the ready block from [`integrations/cline/cline_mcp_settings.json`](integrations/cline/cline_mcp_settings.json) into Cline → MCP Servers → Configure. The repo also ships [`.clinerules/`](.clinerules/) house rules. Guide: [`integrations/cline/README.md`](integrations/cline/README.md).

### Cursor
Open this repo as your Cursor workspace — [`.cursor/mcp.json`](.cursor/mcp.json) auto-registers the server, and [`.cursor/rules/marketnow.mdc`](.cursor/rules/marketnow.mdc) teaches Cursor the house rules. Guide: [`integrations/cursor/README.md`](integrations/cursor/README.md).

### Verify an Agent Trust Card (ATC/1.3)
```bash
curl "https://www.marketnow.site/api/atc?action=ca-key"    # public CA key (Ed25519, RFC 8032)
curl "https://www.marketnow.site/api/atc?action=spec"      # ATC/1.3 specification
curl "https://www.marketnow.site/api/atc?action=verify&card_id=ATC-2026-XXXXX"
```

## Stats (public, machine-readable)

| Metric | Value |
|--------|-------|
| MCP servers indexed | **68,388** |
| Tracked across all sources | **132,737** |
| Core certified (L1) | 59,946 |
| Community indexed | 9,131 |
| Free to install | 68,387 of 68,388 (paid: 1) |
| Paid | 1 |
| L1 index checks | 10/10 passing |
| L2 Sentinel scans | 2,839 of 2,868 npm tarballs |
| Credential formats | 8 (ATC v3, JWT, W3C VC, A2A, EAT-AI, ZTA, MCP Card, X.509) |
| Verification pipeline | 12 stages (UTA) |
| CA | Ed25519 (RFC 8032) |

Source of truth: [`https://www.marketnow.site/api/stats.json`](https://www.marketnow.site/api/stats.json) — CI fails if any surface diverges.

## Security model

Two levels:

- **L1 — index certification**: all 68,388 entries pass 10 metadata/security checks before being indexed.
- **L2 — Sentinel scans**: shipped npm tarballs are scanned (2,839 to date) for injection patterns, embedded secrets and dangerous capabilities. Skills that fail are quarantined and published in the transparency report.

## Conformance

Canonical conformance vectors for the UTA pipeline: [`/uta/conformance/vectors/_index.json`](https://www.marketnow.site/uta/conformance/vectors/_index.json) (schema 1.5.0).

## Links

- **Website:** https://www.marketnow.site
- **GitHub:** https://github.com/alicelabs-llc/marketnow
- **npm:** https://www.npmjs.com/package/marketnow-mcp
- **MCP endpoint:** https://www.marketnow.site/api/mcp
- **Stats API:** https://www.marketnow.site/api/stats.json
- **ATC spec:** https://www.marketnow.site/api/atc?action=spec
- **CA public key:** https://www.marketnow.site/api/atc?action=ca-key

## License

All code in this repository is PROPRIETARY — property of AliceLabs LLC.

For licensing: legal@alicelabs.site
For support: support@alicelabs.site
General: info@alicelabs.site

Built by AliceLabs LLC (Wyoming, USA) — founder Edison Flores.
