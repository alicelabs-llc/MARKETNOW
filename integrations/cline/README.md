# MarketNow in Cline

Cline speaks MCP over stdio, which is exactly what the MarketNow server
exposes. Two supported install paths — pick **one**.

## Option A — Docker (recommended: runs the audited repo tree)

1. Open Cline → **MCP Servers** (sidebar icon) → **Configure MCP Servers**.
   This opens Cline's `cline_mcp_settings.json`.
2. Merge in the `mcpServers` block from
   [`cline_mcp_settings.json`](./cline_mcp_settings.json) in this folder
   (the Docker variant is the live one there).
3. Save. Cline restarts the server automatically and shows 13
   `marketnow_*` tools under the server entry.

The command it runs is:

```bash
docker run -i --rm --init --read-only \
  --cap-drop ALL --security-opt no-new-privileges:true \
  -e NODE_ENV=production \
  ghcr.io/alicelabs-llc/marketnow-mcp:1.15.0
```

Why the flags: `--init` gives clean PID-1 signal handling, `--read-only`
plus `--cap-drop ALL` and `no-new-privileges` are least-privilege posture —
the server needs no writable disk and no capabilities. Egress is limited
to `https://marketnow.site/api/*` (marketplace data; trust verification
itself is fully offline `node:crypto`).

## Option B — npx (no Docker required)

In the same Cline MCP settings file:

```json
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "marketnow-mcp@1.15.0"],
      "env": {},
      "disabled": false,
      "autoApprove": [
        "marketnow_search_skills",
        "marketnow_get_skill",
        "marketnow_list_categories",
        "marketnow_get_manifest",
        "marketnow_get_install_command",
        "marketnow_recommend_skills",
        "marketnow_get_owasp_compliance",
        "marketnow_check_revocation",
        "marketnow_fingerprint_tool"
      ]
    }
  }
}
```

`marketnow-mcp@1.15.0` is the latest version actually published to npm;
the Docker image in Option A is the same release (repo-exact audited build
1.15.0) — both channels in lockstep. Keep the pin; `@latest` can
drift from the audited repo tree.

### If Docker pulls are denied (private package until first visibility flip)

GHCR packages start private. Until an org owner flips the package public
(once — https://github.com/orgs/alicelabs-llc/packages/container/marketnow-mcp/settings
→ Danger Zone → Change visibility → Public), `docker pull` needs a login:

```bash
echo "ghp_YOUR_READ_PACKAGES_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
```

The token only needs `read:packages`. After the one-time flip, anonymous
pulls work and the login step disappears. (CI already tries to flip it
automatically after every push; GitHub currently rejects the API call,
so it stays a manual one-click.)

`autoApprove` whitelists the read-only tools so Cline does not prompt on
every search. Submission, trust verification, referral minting and any
state-changing or judgment tool stay manual-approve on purpose.

## Project rules

If you are working ON this repository with Cline, the
[`.clinerules/`](../../.clinerules/) directory in the repo root already
teaches Cline the house rules: fail-closed security, version discipline,
MCP tool naming, no secrets in the repo. No extra setup needed — Cline
picks it up automatically when the workspace is the repo.

## Verify it works

Ask Cline: *"List the MarketNow MCP tools"*. You should see all 15
`marketnow_*` tools. Then: *"Use marketnow_list_categories"*. If the tool
responds, the pipeline (Cline → stdio → container → MarketNow API) is
healthy.
