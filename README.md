# MarketNow — Security Infrastructure for AI Agents

> **MarketNow doesn't sell AI tools. It determines whether AI agents should be allowed to trust and execute them.**

[![npm version](https://img.shields.io/npm/v/marketnow-mcp)](https://www.npmjs.com/package/marketnow-mcp)
[![npm downloads](https://img.shields.io/npm/dw/marketnow-mcp)](https://www.npmjs.com/package/marketnow-mcp)
[![License: AliceLabs LLC Proprietary](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## What is MarketNow?

MarketNow is **security infrastructure for AI agents**. Not a marketplace.

The marketplace (9,248 MCP skills, all free) is distribution. The product is **Sentinel** — a 10-layer security audit pipeline that determines whether AI agents should be allowed to trust and execute tools.

## Products

### Sentinel — AI Agent Security Engine
10-layer audit pipeline:

| Layer | What it does | Type |
|-------|-------------|------|
| L1.5 | Metadata analysis (auth, CORS, OAuth, rate limiting) | Static |
| L1.6 | Semgrep rules + secret detection + OSV dependency scan | Static |
| L1.7 | Malware pattern detection (binary launchers, install scripts) | Static |
| L1.8 | Malware family signatures (48 YARA-equivalent rules) | Static |
| L1.9 | Prompt injection screening (32 rules, 10 categories) | Static |
| L2.5 | gVisor sandbox (network=none, read-only, cap-drop ALL) | Dynamic |
| L3 | Runtime MCP Interceptor (real-time JSON-RPC guardrail) | Runtime |
| ATC | Agent Trust Card (Ed25519 signed, RFC 8785 JCS) | Identity |
| x402 | Streaming metered billing ($0.01 USDC per call on Base) | Payment |
| A2A | Remote agent execution | Execution |

### Trust Card — Cryptographically verifiable identity
- Ed25519 signatures (RFC 8032)
- RFC 8785 JCS canonical JSON
- Public CA key: `GET https://marketnow.site/api/atc?action=ca-key`
- Verify any card: `GET https://marketnow.site/api/atc?action=verify&card_id=ATC-2026-XXXXX`

### Interceptor — Real-time JSON-RPC guardrail
5 policy rules:
- Block reads of `.env`, `.aws/credentials`, `.ssh/id_rsa`
- Block dangerous commands (`rm -rf`, `DROP TABLE`, `mkfs`)
- Block process spawns (`exec`, `spawn`, `child_process`)
- Block system writes (`/etc/`, `/root/`, `C:\Windows`)
- Warn on non-allowlisted network calls

```bash
curl -X POST https://marketnow.site/api/interceptor \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"execute","arguments":{"command":"rm -rf /"}}}'
# → {"allowed": false, "decision": "block"}
```

### Trust API — Machine-readable trust decisions
```bash
curl https://marketnow.site/api/trust-score?skillId=mn-gen-00003
# → {"trust_score": 8, "recommendation": "safe_to_install"}
```

## Stats (all verified real)

| Metric | Value |
|--------|-------|
| MCP skills catalogued | 9,248 |
| Audited by Sentinel | 5,662 |
| gVisor sandbox runs | 257 |
| Agent Trust Cards issued | 57 |
| CA algorithm | Ed25519 (RFC 8032) |
| npm packages | marketnow-mcp v1.8.0, marketnow-install-stack v1.1.0 |

## Quick start

### Install MCP server
```bash
npx -y marketnow-mcp
```

### Install a skill stack
```bash
npx -y marketnow-install-stack security-analyst
npx -y marketnow-install-stack dev-productivity
```

### Check trust score
```bash
curl https://marketnow.site/api/trust-score?skillId=mn-gen-00003
```

### Test the interceptor
```bash
curl -X POST https://marketnow.site/api/interceptor \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"read_file","arguments":{"path":"/.env"}}}'
```

## Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Basic scan, trust score, public report |
| Developer | $49-99 | Deep audit, signed report |
| Professional | $199-499 | Runtime testing, Trust Card, re-audit |
| Continuous | $99-499/mo | Monitoring, CVE tracking, auto re-audit |
| Enterprise | $5k-50k+/yr | Private audits, API, SLA |

## Links

- **Website:** https://marketnow.site
- **GitHub:** https://github.com/edgarfloresguerra2011-a11y/marketnow
- **npm:** https://www.npmjs.com/package/marketnow-mcp
- **MCP Server:** `npx -y marketnow-mcp`
- **Trust API:** https://marketnow.site/api/trust-score
- **Interceptor:** https://marketnow.site/api/interceptor
- **ATC Spec:** https://marketnow.site/api/atc?action=spec
- **CA Public Key:** https://marketnow.site/api/atc?action=ca-key

## License

AL code in this repository is PROPRIETARY — property of AliceLabs LLC.

For licensing: legal@alicelabs.site
For support: support@alicelabs.site
General: info@alicelabs.site

Built by AliceLabs LLC (Wyoming, USA) — founder Edison Flores.
