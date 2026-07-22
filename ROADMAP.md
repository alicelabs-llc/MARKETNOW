# MarketNow Roadmap

## Vision

Every AI agent has a trust card. Every MCP skill is security-audited. Every agent-to-agent interaction is verified.

We are the SSL for AI agents.

## What's done (July 2026)

### Security (9 layers — all live)
- [x] L1.5 — 6 metadata checks
- [x] L1.6 — 18 Semgrep rules + 18 secret patterns + OSV
- [x] L1.7 — Binary/launcher detection (opens package zips)
- [x] L1.8 — 17 malware family signatures (YARA-equivalent)
- [x] L2 — gVisor sandbox baseline (206 skills sandboxed)
- [x] L3 — Continuous runtime monitoring (drift detection)
- [x] WAF — 40 attack signatures + auto-ban
- [x] Honeypot — 50+ fake paths + 24h ban
- [x] Threat Intel — abuse.ch feeds (URLhaus + MalwareBazaar + ThreatFox)

### Trust
- [x] ATC (Agent Trust Card) — Ed25519 signed, GitHub-persisted ledger
- [x] CA keypair generated and deployed
- [x] Verify + revoke + list + translate operations
- [x] Code examples in Python, JavaScript, Go

### Marketplace
- [x] 8,845 real skills (all from GitHub repos, 0 synthetic)
- [x] 5 languages (EN, ES, PT, ZH, FR)
- [x] npm package (marketnow-mcp v1.5.0)
- [x] MCP Registry published
- [x] 14 API endpoints

### Community
- [x] 45 dev.to articles (677 views, 28 comments)
- [x] 35+ GitHub issues across 10 repos
- [x] Active conversation on CrewAI (8 comments)
- [x] 3 contributors (rushabdev, mario-andreschak, Sravan1011)
- [x] CONTRIBUTING.md + 5 good first issues

## What's next (no budget, all volunteer)

### Q3 2026
- [ ] Python `marketnow-atc` package (issue #11)
- [ ] AutoGen integration (@Sravan1011)
- [ ] Rust ATC verification crate (issue #10)
- [ ] Japanese translation (issue #12)
- [ ] More malware signatures (issue #13)
- [ ] L4 design document — in-process monitoring via eBPF
- [ ] RFC 8785 canonical JSON (fix canonicalization permanently)
- [ ] CA key rotation + key versioning
- [ ] Signed revocation lists with short TTLs

### Q4 2026
- [ ] L4 — in-process runtime monitoring (eBPF on Linux, Endpoint Security on macOS)
- [ ] npm package provenance (Sigstore/cosign)
- [ ] Provenance checks (git commit SHA verification on import)
- [ ] Multi-sig ATC (2+ CAs required for high-value agents)
- [ ] Tool catalog diffing (detect new tools post-certification in real-time)
- [ ] German, Japanese, Korean translations
- [ ] 100+ GitHub stars
- [ ] First paying seller

### 2027
- [ ] L5 — Third-party security audit (when revenue allows)
- [ ] Self-hosted Sentinel (Enterprise tier)
- [ ] A2A Agent Card integration (Google's protocol)
- [ ] Mobile app (PWA)
- [ ] 50,000+ skills
- [ ] First $1,000 MRR

## How to help (free)

### Code
- Pick a [good first issue](https://github.com/edgarfloresguerra2011-a11y/marketnow/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- Review our code and report bugs
- Write tests
- Improve documentation

### Security
- Try to bypass our WAF (responsibly)
- Submit MCP servers for auditing
- Propose new malware family signatures
- Peer-review our crypto implementation

### Content
- Write a tutorial
- Translate a page
- Share on social media
- Star the repo

### Network
- Tell a friend who uses Claude Desktop / Cursor / Cline
- Post on Reddit, HN, Twitter
- Mention us in your Discord/Slack communities

## What we will NOT do

- Pay for ads
- Pay for reviews
- Pay for listings
- Fake stars or downloads
- Claim features we don't have
- Hide incidents or bugs

## Revenue model (when it comes)

All free until revenue exists:
- Skills: **FREE** (we don't sell skills)
- Sentinel audit: **FREE** (Community tier)
- ATC: **FREE** (issue, verify, revoke — all free)
- Seller subscriptions: PRO $9.99/mo, ENTERPRISE $49.99/mo (when sellers exist)
- Commission: 20% on seller sales (when sales happen)

No paywalls on security. No freemium on trust. The audit is free because the internet is safer when everyone can verify.

— *AliceLabs LLC — marketnow.site*
