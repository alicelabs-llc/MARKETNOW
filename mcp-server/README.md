# MarketNow MCP Server

> Search, discover, and install 5,054+ verified MCP skills from any agent runtime.

[![npm version](https://img.shields.io/npm/v/marketnow-mcp.svg)](https://www.npmjs.com/package/marketnow-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The [MarketNow](https://marketnow.site) marketplace as an MCP server. Allows any MCP-compatible agent (Claude Desktop, Cursor, Cline, etc.) to search and discover skills directly from their runtime — without leaving the conversation.

**Stats:** 5,054 skills · 25 categories · $0.99–$9.99 · avg $2.50 · one-time payment

## Install

```bash
npm install -g marketnow-mcp
```

Or use directly with npx (no install needed):

```bash
npx marketnow-mcp
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "marketnow": {
      "command": "npx",
      "args": ["-y", "marketnow-mcp"]
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
      "args": ["-y", "marketnow-mcp"]
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
      "args": ["-y", "marketnow-mcp"],
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

Claude will use the MarketNow MCP server to search the marketplace and return results with prices, descriptions, and install commands.

## How It Works

The MCP server fetches the public API at `https://marketnow.site/api/skills.json` (cached for 1 hour). It exposes 5 tools that agents can call to discover skills without leaving their runtime.

- **No API key required** for read operations
- **CORS-enabled** — works from browser and Node.js
- **1-hour cache** — minimizes bandwidth and latency
- **5,000+ skills** — the largest curated MCP skill catalog

To purchase a skill, the agent opens the buy URL in a browser.

## Pricing

All skills on MarketNow are micro-priced:

- **$0.99** — utility, single-function MCP servers
- **$1.99** — standard integrations
- **$2.99** — multi-feature tools (most common)
- **$4.99** — sophisticated multi-endpoint tools
- **$9.99** — enterprise-grade, specialized

Average price: **$2.50**. One-time payment, lifetime license. No subscriptions.

## Links

- **Website**: [https://marketnow.site](https://marketnow.site)
- **Registry**: [https://marketnow.site/registry](https://marketnow.site/registry)
- **Submit a skill**: [https://marketnow.site/submit](https://marketnow.site/submit)
- **API docs**: [https://marketnow.site/api/agent.json](https://marketnow.site/api/agent.json)
- **GitHub**: [https://github.com/edgarfloresguerra2011-a11y/marketnow](https://github.com/edgarfloresguerra2011-a11y/marketnow)

## License

MIT
