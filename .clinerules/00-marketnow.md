# MarketNow — Project Rules for Cline

These rules apply to every task in this repository. Read them before writing code.

## What this repository is

MarketNow (`marketnow.site`) is trust infrastructure for AI agents: an MCP
marketplace of security-audited skills, the Sentinel audit engine
(L1.5/L1.7 static scans → L2.5 gVisor sandbox), and the Agent Trust Card
(ATC/1.0) verification stack. AliceLabs LLC owns the code and the
"Sentinel" trademark. The MCP server (`mcp-server/`) is the product's
front door: 13 `marketnow_*` tools over stdio.

## Non-negotiable rules

1. **Fail-closed, always.** Any trust/security decision must DENY when
   evidence is missing. A valid signature is never sufficient: trusted CA
   required, revocation evidence required when `revocation_check_required`
   is true. If you find an "ask first / default allow" path in security
   code, that is a bug — fix it before anything else.
2. **Version truth = `mcp-server/package.json`.** Never hardcode a version
   string anywhere (serverInfo, banners, server.json, Dockerfile, docs
   snippets). Read it or reference it. `scripts/check-version-sync.mjs`
   fails CI on drift — keep every surface in sync when bumping.
3. **Tool names are `marketnow_<snake_case>`.** 13 tools, no more, no
   fewer. Descriptions tell the agent WHEN to call, not WHAT the code does.
   inputSchema must be strict Zod (type + enum + description on every
   property). Responses are MCP content envelopes; errors are `isError`
   payloads, never thrown exceptions.
4. **Secrets never enter the repo.** No tokens, no passwords, no keys —
   not in code, not in docs, not in markdown status files, not in git
   history. If a credential appears in a file you touch, stop and report
   it; the rotation procedure comes before the feature.
5. **Marketing claims must match the ROADMAP.** Static scan coverage is
   L1.x. Behavioral/runtime claims are L2+ and still in the ROADMAP — do
   not describe shipped features with future-tense capabilities.
6. **The MCP server runs from this repo AND from Docker.** Integration
   configs (`.cursor/mcp.json`, `integrations/cline/`,
   `docker/mcp-registry-entry.yaml`, `mcp-server/Dockerfile`) are release
   artifacts: if you change tool count, version, image name or run flags,
   update them all in the same commit.

## Where things live

- `mcp-server/` — the stdio MCP server (npm package `marketnow-mcp`,
  Docker image `ghcr.io/alicelabs-llc/marketnow-mcp`).
- `atc-sdk/` — Agent Trust Card SDK (Ed25519, RFC 8785 JCS).
- `scripts/` — CI helpers; `docker-smoke-test.sh` is the image handshake gate.
- `integrations/` — client-specific install docs (Cline, Cursor, Docker).
- `docker/` — Docker MCP Toolkit/Registry catalog entry.
- `_data/` — marketplace data (generated, do not hand-edit).

## Definition of done for any change in `mcp-server/`

1. `node --check mcp-server/index.js` passes.
2. Version bumped in `mcp-server/package.json` + `server.json` +
   AUDIT.md changelog entry + README badge (same PR).
3. `bash scripts/docker-smoke-test.sh <image>` passes if the runtime or
   tool surface changed.
4. CI green: syntax, 26 fail-closed test cases, version-sync,
   integrations validation.
