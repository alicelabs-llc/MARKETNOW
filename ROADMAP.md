# MarketNow Roadmap

## Vision

Every AI agent has a trust card. Every MCP skill is security-audited. Every agent-to-agent interaction is verified.

We are the SSL for AI agents.

## What's done (July 2026)

### Security (10 layers — all live)
- [x] L1.5 — 6 metadata checks
- [x] L1.6 — 36 Semgrep rules + 18 secret patterns + OSV
- [x] L1.7 — 8 malware patterns + binary/launcher detection
- [x] L1.8 — **48 malware family signatures** (was 28, target was 50+)
- [x] L1.9 — 32 prompt injection defense rules (10 categories)
- [x] L2 — gVisor sandbox (network=none, read-only, cap-drop ALL)
- [x] L3 — Continuous runtime monitoring (weekly re-audit, 6 drift types)
- [x] WAF — 38 attack signatures + auto-ban
- [x] Honeypot — 50+ fake paths + 24h ban
- [x] Threat Intel — abuse.ch feeds (URLhaus + MalwareBazaar + ThreatFox)

### Trust
- [x] ATC v1.1.0 — Ed25519 signed, RFC 8785 JCS, decision_authority="consumer"
- [x] Action-receipts — signed delivery proof (Ed25519)
- [x] Vibe mutual hop — bidirectional Ed25519 receipt verification
- [x] Referral tracking — 5% commission, public ledger
- [x] CA key rotation + key versioning
- [x] Code examples in Python, JavaScript, Go, Rust

### Marketplace
- [x] 9,248 audited skills
- [x] 18 community-submitted servers (n8n, Google, Anthropic, ByteDance, Vibe)
- [x] 7 languages (EN, ES, ZH, JA, FR, DE, KO)
- [x] npm v1.7.0 (11 MCP tools)
- [x] Python SDK (marketnow-atc)
- [x] GitHub Action (marketnow-audit@v1)
- [x] CLI (marketnow-audit)
- [x] Badge SVG (Verified + First 100)
- [x] 23 dev.to articles (including MCP Security 101 course, 5 chapters)
- [x] 3 free programs (Challenge, Partnership, Bug Bounty)
- [x] 13 Hacktoberfest issues

## Q3 2026 — Status

- [x] Python `marketnow-atc` package — DONE
- [x] RFC 8785 canonical JSON — DONE
- [x] CA key rotation — DONE
- [x] L4 design document — DONE
- [x] More malware signatures (48 total) — DONE
- [x] Rust ATC verification example fixed — DONE
- [x] German + Korean translations — DONE (7 languages total)
- [x] **Cancel API (#22)** — DONE (async mode + status + cancel)
- [x] **Signed revocation lists with TTL** — DONE (lib/revocation-list.mjs, OCSP-style)
- [ ] npm package provenance (Sigstore) — documented, needs CI change
- [ ] Japanese /trust translation — DONE (trust-ja.json)

**Q3 completion: 10/11 items done (91%)**

## Q4 2026

- [ ] L4 — in-process runtime monitoring (eBPF on Linux, Endpoint Security on macOS)
- [ ] npm package provenance (Sigstore) — implement in CI
- [ ] Provenance checks (git commit SHA verification on import)
- [ ] Multi-sig ATC (2+ CAs required for high-value agents)
- [ ] Tool catalog diffing (detect new tools post-certification in real-time)
- [ ] 100+ GitHub stars
- [ ] First paying seller

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
