# Sentinel SOC 2 Type II Control Mapping

## Overview

This document maps each Sentinel security layer to specific SOC 2 Trust Services Criteria (TSC) controls. Organizations using MarketNow can leverage this mapping to demonstrate compliance with SOC 2 requirements during audits.

**Last updated:** July 2026
**Sentinel version:** 9 layers (L1.5 → L1.9 + L3 + WAF + Honeypot + Threat Intel + Quarantine)

## SOC 2 Trust Services Criteria

### CC1 — Control Environment

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC1.1 — Management demonstrates commitment to integrity and ethics | /trust page | Public trust page shows every "pending" item. No pretending. Every incident is disclosed. |
| CC1.4 — Management attracts, develops, and retains competent personnel | Open source + community review | Issue #2 is an open call for peer review. @rushabdev did pro bono review (11 findings). All credited publicly. |
| CC1.5 — Management enforces accountability | Git history | Every change is a git commit. Every status change on /trust is visible. Audit trail = commit history. |

### CC2 — Communication and Information

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC2.1 — Internal communication of security matters | /api/security | Consolidated security endpoint with real-time status of all 9 layers. |
| CC2.2 — External communication of security matters | /trust + dev.to | Public trust page + 49 dev.to articles documenting security methodology and incidents. |
| CC2.3 — Communication with affected parties | GitHub issues | Issue #9 (trojan) was responded to publicly within hours. Affected users notified via issue comments. |

### CC3 — Risk Assessment

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC3.1 — Risk identification | L1.5-L1.9 | 9-layer pipeline identifies risks: metadata issues, secrets, binaries, malware families, prompt injection, runtime drift. |
| CC3.2 — Risk assessment | Sentinel scoring (0-10) | Every skill gets a risk score. Low (8-10), Medium (5-7), High (1-4), Critical (0). |
| CC3.3 — Risk response | Auto-quarantine | Critical findings → skill removed from catalog + publicly listed at /api/security?view=quarantine. |
| CC3.4 — Risk assessment for changes | L3 continuous monitoring | Weekly re-audit detects drift. Supply chain changes, tool catalog changes, permission expansion. |

### CC4 — Monitoring Activities

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC4.1 — Ongoing evaluations | L3 + weekly batch audit | GitHub Actions runs weekly: L1.6 batch audit, L2 sandbox re-audit, L3 drift detection, certificate renewal. |
| CC4.2 — Deficiencies communicated | /api/security + /trust | Security overview endpoint shows real-time status. Quarantine list is public. |
| CC4.2 — Deficiencies communicated | WAF + Honeypot logs | Attack attempts logged at /api/security?view=honeypot and ?view=waf. IPs banned. |

### CC5 — Control Activities

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC5.1 — Select and develop control activities | L1.5-L1.9 | 9 layers of defense-in-depth: metadata, semgrep, secrets, binaries, malware families, prompt injection, sandbox, drift, WAF. |
| CC5.2 — Deploy control activities | Production deployment | All 9 layers run in production on Vercel + GitHub Actions. 14 API endpoints. |
| CC5.3 — IT controls | WAF (40 rules) | 40 attack signatures: SQLi, XSS, SSRF, path traversal, command injection, NoSQL injection, prototype pollution, SSTI. |

### CC6 — Logical and Physical Access Controls

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC6.1 — Logical access security | ATC (Agent Trust Card) | Ed25519-signed identity cards. Agents verify each other before interacting. Revocation is instant. |
| CC6.2 — User authentication | ATC + CA keypair | Agents authenticate via Ed25519 keypairs. CA validates signatures. Compromised keys are revoked. |
| CC6.3 — Access restrictions | Mandates (ACP/AP2) | Pre-approved spending limits, per-purchase caps, category restrictions. Human-in-the-loop by default. |
| CC6.6 — Network security | WAF + Honeypot | WAF blocks 40 attack patterns. Honeypot bans scanners hitting 50+ fake paths for 24h. |
| CC6.7 — Data transmission | USDC on Base (on-chain) | Payment verification via eth_getTransactionReceipt. Every transaction is auditable on-chain. |

### CC7 — System Operations

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC7.1 — System monitoring | L3 + Threat Intel | L3 monitors skill behavior weekly. Threat intel feeds (URLhaus + MalwareBazaar + ThreatFox) provide real-time IOC data. |
| CC7.2 — Incident detection | Honeypot + WAF | Honeypot detects reconnaissance. WAF detects exploitation attempts. Both auto-ban offending IPs. |
| CC7.3 — Incident response | Auto-quarantine | Critical finding → skill moved to _data/quarantine/ → removed from catalog → publicly listed. |
| CC7.4 — Incident recovery | Git-based architecture | All state is in git (mandates, ATCs, certificates, quarantine). Recovery = git revert. No database to restore. |
| CC7.5 — Change management | L1.7 + L3 | L1.7 scans package contents. L3 detects supply chain drift (git SHA changes, npm version changes). |

### CC8 — Change Management

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC8.1 — Authorize changes | CA key rotation | CA key registry tracks all signing keys. Old keys are retired. ATCs must be re-signed with active keys. |

### CC9 — Risk Mitigation

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| CC9.1 — Identify and mitigate risk | RFC 8785 + CA rotation | RFC 8785 canonical JSON prevents signature forgery. CA key rotation handles key compromise. |
| CC9.2 — Business continuity | GitHub-based architecture | All data in public GitHub repo. If Vercel goes down, API can be re-deployed to any platform. Data survives. |

## Additional TSC Criteria

### Availability (A)

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| A1.1 — System availability | Vercel + GitHub | Vercel auto-scaling. GitHub for persistence. 99.9%+ uptime historically. |
| A1.2 — Environmental protections | Rate limiting | API rate limits prevent resource exhaustion. WAF blocks DoS patterns. |

### Confidentiality (C)

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| C1.1 — Confidential information | L1.6 secret detection | 18 secret patterns detected: Stripe, GitHub, AWS, private keys, mnemonics, JWT, Slack, Discord, Google, Twilio. |
| C1.2 — Disposal of confidential information | L1.5 P5 (EIP-191 fix) | Signatures are SHA-256 hashed before storage. Raw signatures never persisted. |

### Processing Integrity (PI)

| SOC 2 Control | Sentinel Layer | How we address it |
|---|---|---|
| PI1.1 — Valid processing | ATC verify + RFC 8785 | Every ATC is cryptographically verified. Canonical JSON (RFC 8785) ensures deterministic serialization. |

## How to use this mapping

1. **For auditors:** each row shows how MarketNow addresses a specific SOC 2 control. Evidence is in the linked Sentinel layer, the /trust page, or the GitHub commit history.

2. **For Enterprise customers:** this mapping demonstrates that MarketNow's security infrastructure is designed to support SOC 2 compliance. Enterprise tier ($49.99/mo) includes this document as a downloadable compliance artifact.

3. **For security teams:** the mapping is transparent. If a control is not fully addressed, it says so (e.g., physical access controls are not applicable — we're cloud-only).

## Limitations

- This is a self-assessment, not a certified SOC 2 audit. A certified audit requires a third-party auditor (e.g., Vanta, Drata, Prescient).
- Physical security controls (CC6.4, CC6.5) are not applicable — MarketNow is 100% cloud-based.
- This mapping does not constitute legal advice. Consult your compliance team.

## Roadmap to full SOC 2 Type II

| Step | What | Timeline | Cost |
|---|---|---|---|
| 1 | Self-assessment (this document) | Done | $0 |
| 2 | Implement any gaps identified | Q4 2026 | $0 |
| 3 | Engage a compliance platform (Vanta/Drata) | Q1 2027 | $8K-$12K/year |
| 4 | Third-party audit (AICPA firm) | Q2 2027 | $15K-$50K |
| 5 | SOC 2 Type II report | Q3 2027 | — |

Steps 3-5 require revenue. Until then, this self-assessment is the best we can offer — and it's more than most MCP directories have (which is nothing).

— *AliceLabs LLC — marketnow.site*
