# MarketNow MCP Server

The MarketNow marketplace as an MCP server. Allows any MCP-compatible agent (Claude Desktop, Cursor, Cline, etc.) to search and discover skills directly from their runtime.

## Install

```bash
npm install -g @marketnow/mcp-server
```

Or use directly with npx (no install needed):

```bash
npx @marketnow/mcp-server
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "@marketnow/mcp-server"]
    }
  }
}
```

### Cursor

Add to Settings → MCP:

```json
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "@marketnow/mcp-server"]
    }
  }
}
```

### Cline / VS Code

Add to your MCP config:

```json
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "@marketnow/mcp-server"],
      "env": {}
    }
  }
}
```

## Tools Exposed

| Tool | Description |
|---|---|
| `search_skills` | Search skills by query, category, or max price |
| `get_skill` | Get full details of a specific skill |
| `list_categories` | List all 25 categories with counts |
| `get_manifest` | Get marketplace metadata (totals, pricing) |
| `get_install_command` | Get the npx install command for a skill |

## Example Usage

Once connected, you can ask Claude:

- "Find me a skill to scrape websites and extract prices"
- "What's the cheapest AI/ML skill on MarketNow?"
- "Show me all skills in the Security category"
- "Get the install command for mn-ai-00001"

Claude will use the MarketNow MCP server to search and return results.

## How It Works

The MCP server fetches the public API at `https://marketnow.site/api/skills.json` (cached for 1 hour). It exposes 5 tools that agents can call to discover skills without leaving their runtime.

No API key required for read operations. To purchase a skill, the agent opens the buy URL in a browser.

## License

MIT
