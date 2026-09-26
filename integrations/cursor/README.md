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

Keep the version pinned to the audited release (the repo's
`mcp-server/package.json` is the source of truth; CI's version-sync gate
validates the shipped config against it).

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
