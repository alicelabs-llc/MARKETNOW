# MarketNow — Sentinel L2 Design Document

## Overview

Sentinel L1 is the current automated security scan (static analysis). It runs on every skill submission and checks:
- Repository exists and is public
- README is present
- Package manifest exists (package.json, pyproject.toml, Cargo.toml, go.mod)
- Open-source license is detected
- No hardcoded secrets (regex patterns)
- No malicious code patterns (regex patterns)

**Sentinel L2** is the next level: **dynamic sandboxed execution**. It actually runs the skill in an isolated environment and verifies that it does what it claims.

## Why L2?

L1 catches obvious issues (missing README, hardcoded secrets). But it can't catch:
- Skills that exfiltrate data at runtime (e.g., sending env vars to an external server)
- Skills that have side effects not documented (e.g., creating files, modifying system config)
- Skills that work differently than their description claims
- Skills with time-bombed behavior (activated after a delay)
- Skills that detect sandbox environments and behave differently

L2 addresses these by actually running the skill in a controlled sandbox.

## Architecture

```
Submission received
       ↓
Sentinel L1 (static scan) — current implementation
       ↓ (passes)
Sentinel L2 (dynamic scan) — new
       ↓
┌──────────────────────────────────┐
│ Sandbox Environment              │
│ - Docker container (isolated)    │
│ - No network access (or limited) │
│ - No filesystem access (tmpfs)   │
│ - CPU/memory limits              │
│ - Timeout: 30 seconds            │
└──────────────────────────────────┘
       ↓
Run skill with test inputs
       ↓
Monitor:
  - Network calls (DNS, HTTP, TCP)
  - File system changes
  - Process spawns
  - Environment variable access
  - stdout/stderr output
       ↓
Compare actual behavior vs. claimed behavior
       ↓
Score: 0-10 (L2 score)
       ↓
If score >= 7/10: APPROVED
If score 4-6: MANUAL REVIEW
If score < 4: REJECTED
```

## Implementation Plan

### Phase 1: Basic Sandbox (MVP)

Use Docker to run skills in isolation:

```dockerfile
# sentinel-l2-sandbox
FROM node:20-slim
# No network access by default
# Limited filesystem (tmpfs)
# CPU: 1 core, Memory: 512MB
# Timeout: 30s
```

Run the skill with mock inputs and capture:
- Network calls (using a transparent proxy or DNS interception)
- File system changes (using inotify or overlayfs diff)
- Process spawns (using strace or auditd)
- stdout/stderr output

### Phase 2: Behavior Comparison

For each skill, generate test cases based on:
- The skill's claimed features (from README/description)
- Common MCP tool calls (e.g., `search`, `get`, `list`)
- Edge cases (empty inputs, large inputs, malformed inputs)

Compare:
- Does the skill respond to MCP `tools/list` correctly?
- Does it expose the claimed tools?
- Do the tools return expected response shapes?
- Are there unexpected network calls?
- Are there unexpected file writes?

### Phase 3: Continuous Monitoring

After a skill is listed, periodically re-scan it:
- When the source repo is updated (GitHub webhook)
- Random spot-checks (monthly)
- When users report issues

## Network Policy

Default: **no network access** in the sandbox.

Allow-listed domains (configurable per skill):
- `registry.npmjs.org` (for installing dependencies)
- `pypi.org` (for Python packages)
- `github.com` (for cloning the repo)

Any other network call = **flagged as suspicious**.

## Scoring Rubric (L2)

| Check | Points |
|---|---|
| Responds to MCP `initialize` | 1 |
| Responds to MCP `tools/list` | 1 |
| Exposes at least 1 tool | 1 |
| Tools return valid JSON-RPC responses | 1 |
| No unexpected network calls | 2 |
| No unexpected file writes outside tmpdir | 1 |
| No process spawns (sh, bash, exec) | 1 |
| No environment variable exfiltration | 1 |
| Responds within 30s timeout | 1 |

Total: 10 points. Minimum to pass: 7/10.

## Cost Considerations

Running Docker containers for each submission has costs:
- CPU time: ~30s per scan
- Storage: ~500MB per scan (container image + skill code)
- Network: ~100MB per scan (downloading dependencies)

At 1,000 submissions/month:
- ~8.3 hours of CPU time
- ~500GB storage (if we keep scan logs)
- ~100GB network

Estimated cost: $50-100/month on AWS/AWS Fargate or Google Cloud Run.

## Security of the Sandbox Itself

The sandbox must be escape-proof:
- Run as non-root user
- No capabilities (drop ALL)
- Read-only root filesystem (except tmpfs)
- No network (except allow-listed)
- seccomp profile (block dangerous syscalls)
- AppArmor/SELinux profile

## Tech Stack

- **Container runtime:** Docker or Podman
- **Orchestration:** Kubernetes (for scaling) or just cron + Docker (for MVP)
- **Network monitoring:** mitmproxy or eBPF
- **File monitoring:** inotifywait or overlayfs diff
- **Process monitoring:** strace or auditd
- **Scoring:** Node.js/Python script

## Timeline

- **Week 1-2:** Basic Docker sandbox + network monitoring
- **Week 3-4:** Behavior comparison (MCP protocol checks)
- **Week 5-6:** Scoring system + integration with submission flow
- **Week 7-8:** Continuous monitoring + GitHub webhook integration

## Future: Sentinel L3

L3 would include:
- Fuzzing (random inputs to find crashes/bugs)
- Dependency vulnerability scanning (npm audit, safety check, etc.)
- Code similarity analysis (detect copies of known-malicious code)
- AI-powered behavior analysis (LLM reviews the code and output)

## Conclusion

Sentinel L2 is the natural evolution of MarketNow's security posture. It moves from "does the code look safe?" (L1) to "does the code behave safely?" (L2). This is a significant differentiator from other MCP marketplaces that only do manual review.
