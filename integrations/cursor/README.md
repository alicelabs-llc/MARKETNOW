# MarketNow in Cursor

Cursor loads MCP servers from `.cursor/mcp.json` **per project**. This
repository ships one — open this repo as your Cursor workspace and the
`marketnow` server (Docker transport) appears automatically in
*Cursor Settings → MCP*. Click its refresh/enable toggle and the 13
`marketnow_*` tools become callable from chat/agent/composer.

The shipped config runs:

```bash
docker run -i --rm --init --read-only \
  --cap-drop ALL --security-opt no-new-privileges:true \
  -e NODE_ENV=production \
  ghcr.io/alicelabs-llc/marketnow-mcp:1.15.0
```

## No Docker? Use the npm channel

Edit `.cursor/mcp.json` (project) or your global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "marketnow-mcp@1.15.0"]
    }
  }
}
```

`marketnow-mcp@1.15.0` is the latest version actually published to npm;
the Docker image the shipped config uses is the same release
(repo-exact audited build 1.15.0). Keep the version pinned — the repo's `mcp-server/package.json`
is the source of truth and CI's version-sync gate validates the shipped
config against it.

### If Docker pulls are denied

GHCR packages start private. Until an org owner flips the package public
once (https://github.com/orgs/alicelabs-llc/packages/container/marketnow-mcp/settings
→ Danger Zone → Change visibility → Public), prefix the command with a
one-time login:

```bash
echo "ghp_YOUR_READ_PACKAGES_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
```

The token only needs `read:packages`. After the flip, anonymous pulls work.

## Global install (all Cursor projects)

```bash
cursor mcp add --transport stdio marketnow -- \
  docker run -i --rm --init --read-only \
  --cap-drop ALL --security-opt no-new-privileges:true \
  -e NODE_ENV=production \
  ghcr.io/alicelabs-llc/marketnow-mcp:1.15.0
```

## Project rules

`.cursor/rules/marketnow.mdc` in this repo teaches Cursor the house rules
(fail-closed security, version discipline, frozen 13-tool surface, no
secrets). It applies automatically to `mcp-server/**`, `docker/**`,
`integrations/**`, `scripts/**` and workflow files — no import needed.

## Verify it works

In Cursor chat (agent mode): *"List my MCP tools"* → 13 `marketnow_*`
tools. Then: *"Call marketnow_list_categories"*. A JSON response with the
taxonomy and counts means the whole chain (Cursor → stdio → container →
MarketNow API) is healthy.
