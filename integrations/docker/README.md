# MarketNow MCP — Docker

The server is a **stdio MCP endpoint**: its container's PID 1 speaks
JSON-RPC on stdin/stdout. There is no HTTP port to publish — the MCP
client (Cline, Cursor, Claude Desktop, Docker MCP Toolkit, your own
script) owns the process lifecycle.

## Build & run locally

```bash
# from the repository root
docker build -t marketnow-mcp ./mcp-server

# speak MCP to it
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0.0.1"}}}' \
  | docker run -i --rm marketnow-mcp
```

Or with compose (same flags CI uses):

```bash
docker compose build
docker compose run --rm -T marketnow-mcp < request.jsonl
```

## The published image

CI (`integrations-ci.yml`) builds, smoke-tests and pushes on every push
to `master`:

```text
ghcr.io/alicelabs-llc/marketnow-mcp:1.15.0   (pinned — audited tree)
ghcr.io/alicelabs-llc/marketnow-mcp:latest   (moving — same branch)
```

Pull it without cloning anything:

```bash
docker run -i --rm ghcr.io/alicelabs-llc/marketnow-mcp:1.15.0
```

> **Pull denied?** GHCR packages start private. A one-time org-owner flip —
> https://github.com/orgs/alicelabs-llc/packages/container/marketnow-mcp/settings
> → Danger Zone → Change visibility → Public — makes pulls anonymous.
> Until then: `echo "ghp_TOKEN_read_packages" | docker login ghcr.io -u USER --password-stdin`.
> CI attempts the visibility flip via API after every push (idempotent);
> GitHub currently rejects that call, so it remains a manual one-click.

## Hardening model (why the flags exist)

| Flag | Reason |
|------|--------|
| `--init` | tini as PID 1 → correct SIGTERM reaping for stdio servers |
| `--read-only` | the app never writes to disk; rootfs immutable |
| `--cap-drop ALL` | no capabilities needed |
| `--security-opt no-new-privileges:true` | blocks privilege escalation |
| `user 1000:1000` | unprivileged `node` user baked into the image |

Egress: only `https://marketnow.site/api/*` (marketplace data on first
tool call). ATC/Ed25519 trust verification is fully offline — no network
participates in a trust decision.

## CI handshake gate

`scripts/docker-smoke-test.sh <image>` sends a real MCP session
(`initialize` + `tools/list`) into the container and asserts:

1. `serverInfo.name == "marketnow"`
2. `serverInfo.version == mcp-server/package.json` version (drift guard)
3. exactly the 13 expected `marketnow_*` tools (surface guard)
4. stdout carries only JSON-RPC frames (logs go to stderr)

An image that fails the handshake is never pushed.

## Docker MCP Toolkit / Registry

`docker/mcp-registry-entry.yaml` is the ready-to-submit catalog entry for
the [Docker MCP Registry](https://github.com/docker/mcp-registry). Users
of Docker Desktop's MCP Toolkit then get one-command install:

```bash
docker mcp gateway add --docker ghcr.io/alicelabs-llc/marketnow-mcp
```

See the file header for the submission procedure.
