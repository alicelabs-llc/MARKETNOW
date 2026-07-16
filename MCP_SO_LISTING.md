# MarketNow — mcp.so Listing Instructions

## Status: MANUAL SUBMISSION REQUIRED

mcp.so (https://mcp.so) has Cloudflare protection that blocks automated submissions. You need to submit manually.

## Steps

1. **Go to https://mcp.so/submit** (or look for "Submit" / "Add Server" button on the homepage)

2. **Fill in the form with these values:**

### Server Name
```
MarketNow — MCP Skills Marketplace with Sentinel Certification
```

### Tagline / Short Description
```
8,582 MCP servers certified with 3-layer Sentinel security audit + signed SHA-256 certificates
```

### Full Description
```
MarketNow is the first MCP marketplace to offer security certification for MCP servers.

Every MCP server in the catalog (8,582+) is audited by Sentinel, a 3-layer security pipeline:

L1.5 — 6 metadata checks (AUTH, prompt injection, input validation, CORS, OAuth scopes, rate limiting)
L1.6 — Static analysis: 18 Semgrep rules + 18 secret patterns + OSV API dependency check
L2 — Docker sandbox: runs the MCP server in isolation (--network none, --read-only, --cap-drop ALL)

Each skill gets a signed SHA-256 certificate with:
- Verified score (0-10)
- Risk level (low/medium/high/critical)
- 7-day validity (regenerated weekly by GitHub Actions)
- Public verification at marketnow.site/verify

Results:
- 6 low risk (score 10/10)
- 8,474 medium risk (score 6-9)
- 91 high risk (score 2-4)
- 11 critical (score 0-1)

Transparency dashboard: marketnow.site/sentinel-transparency
```

### Website URL
```
https://marketnow.site
```

### GitHub Repository
```
https://github.com/edgarfloresguerra2011-a11y/marketnow
```

### Categories
```
Marketplace, Security, Aggregator, Certification
```

### Tags
```
mcp, security, certification, sentinel, marketplace, audit, docker-sandbox
```

### Install Command (if asked)
```
npx -y @marketnow/install <skill-slug>
```

### Logo / Icon
Use the MarketNow favicon: https://marketnow.site/favicon.svg

### Features to highlight
- ✅ 8,582 MCP servers certified
- ✅ 3-layer security audit (L1.5 + L1.6 + L2 Docker sandbox)
- ✅ Signed SHA-256 certificates
- ✅ Public verification at /verify
- ✅ Transparency dashboard at /sentinel-transparency
- ✅ Markdown badges for READMEs
- ✅ Weekly automatic re-audit (GitHub Actions cron)
- ✅ USDC payments on Base L2
- ✅ JSON-RPC MCP endpoint
- ✅ 5 languages (EN, ES, PT, ZH, FR)

## After submission

1. mcp.so may take 24-48 hours to review and list
2. Once listed, share the mcp.so URL on social media
3. Add the mcp.so link to your README.md
4. Consider adding mcp.so badge to your homepage

## Alternative directories to submit

- [ ] mcp.so — https://mcp.so/submit
- [ ] glama.ai — https://glama.ai/mcp/servers
- [ ] Smithery — https://smithery.ai
- [ ] OpenTools — https://opentools.ai
- [ ] Product Hunt (for launch)
