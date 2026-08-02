# MarketNow Roadmap

## Vision

Every AI agent has a trust card. Every MCP skill is security-audited. Every agent-to-agent interaction is verified.

We are the SSL for AI agents.

## What's done (August 2026)

### Security (10 layers + L4 prototype — all live or prototyped)
- [x] L1.5 — 6 metadata checks
- [x] L1.6 — 36 Semgrep rules + 18 secret patterns + OSV
- [x] L1.7 — 8 malware patterns + binary/launcher detection
- [x] L1.8 — 48 malware family signatures (YARA-equivalent)
- [x] L1.9 — 32 prompt injection defense rules (10 categories)
- [x] L2 — gVisor sandbox (network=none, read-only, cap-drop ALL)
- [x] L3 — Continuous runtime monitoring (weekly re-audit, 6 drift types)
- [x] WAF — 38 attack signatures + auto-ban
- [x] Honeypot — 50+ fake paths + 24h ban
- [x] Threat Intel — abuse.ch feeds (URLhaus + MalwareBazaar + ThreatFox)
- [x] L4 — eBPF prototype (network + filesystem + process monitors) + policy engine + L3 integration

### Trust
- [x] ATC v1.1.0 — Ed25519 signed, RFC 8785 JCS, decision_authority="consumer"
- [x] Action-receipts — signed delivery proof (Ed25519)
- [x] Vibe mutual hop — bidirectional Ed25519 receipt verification
- [x] Referral tracking — 5% commission, public ledger
- [x] CA key rotation + key versioning
- [x] Signed revocation list with TTL (OCSP-style, 60s)
- [x] Multi-sig ATC schema v1.2.0 (2+ CAs for high-value agents)
- [x] Code examples in Python, JavaScript, Go, Rust

### Marketplace
- [x] 9,248 audited skills
- [x] 18 community-submitted servers
- [x] 7 languages (EN, ES, ZH, JA, FR, DE, KO)
- [x] npm v1.7.0 (11 MCP tools)
- [x] Python SDK (marketnow-atc)
- [x] GitHub Action (marketnow-audit@v1)
- [x] CLI (marketnow-audit)
- [x] Badge SVG (Verified + First 100)
- [x] Cancel API (async mode + status + cancel)
- [x] 23 dev.to articles (including MCP Security 101 course, 5 chapters)
- [x] 3 free programs (Challenge, Partnership, Bug Bounty)
- [x] 13 Hacktoberfest issues

### Tooling
- [x] Tool catalog diffing (detect tool changes post-cert)
- [x] Provenance verification (commit SHA tracking)
- [x] npm provenance workflow (Sigstore, ready to enable)

## Q3 2026 — COMPLETE (91%)

- [x] Python `marketnow-atc` package
- [x] RFC 8785 canonical JSON
- [x] CA key rotation
- [x] L4 design document
- [x] More malware signatures (48 total)
- [x] Rust ATC verification example
- [x] German + Korean translations
- [x] Cancel API (#22)
- [x] Signed revocation lists with TTL
- [x] Japanese /trust translation
- [ ] npm provenance (workflow ready, needs NPM_TOKEN secret in CI)

## Q4 2026 — 80% COMPLETE

- [x] L4 — eBPF prototype (network + filesystem + process monitors)
- [x] L4 — policy engine (Python, 4 alert levels, auto-revoke)
- [x] L4 — integration with L3 (drift feed, revocation, baseline update)
- [x] npm package provenance (Sigstore workflow ready)
- [x] Tool catalog diffing
- [x] Provenance checks (git commit SHA verification)
- [x] Multi-sig ATC (schema v1.2.0, 2+ CAs)
- [x] L4 design update (eBPF hooks, macOS ES, policy engine)
- [ ] 100+ GitHub stars — pending external adoption
- [ ] First paying seller — pending external adoption

**Q4 engineering: 8/10 complete. Remaining 2 items depend on external adoption.**

## 2027

- [ ] L5 — Third-party security audit
- [ ] Self-hosted Sentinel (Enterprise tier)
- [ ] A2A Agent Card integration (Google's protocol)
- [ ] Mobile app (PWA)
- [ ] 50,000+ skills
- [ ] First $1,000 MRR

## What we will NOT do

- Pay for ads
- Sell user data
- Paywall trust verification
- Charge for basic audits
