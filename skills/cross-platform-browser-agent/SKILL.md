---
name: cross-platform-browser-agent
description: Universal browser automation engine for AI agents. Use when agents need to interact with any website that lacks an API — filling forms, clicking buttons, extracting data, monitoring pages, or completing multi-step web workflows. Solves the "there's no API for this" problem with reliable browser automation.
---

# Cross-Platform Browser Agent - API-Free Website Automation

## Overview

Cross-Platform Browser Agent enables AI agents to interact with any website as if they were a human user. Uses Playwright/Puppeteer for browser control with AI-powered element discovery, smart wait strategies, and self-healing selectors. Perfect for websites without APIs, legacy systems, web apps with complex JavaScript, and multi-step online workflows.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Website has no API → agent is stuck | Full browser automation with human-like interaction |
| CSS selectors break on site updates | Self-healing selectors (AI finds elements by intent) |
| CAPTCHAs block automation | CAPTCHA detection + rotation strategies |
| Multi-step workflows are fragile | Reliable step execution with recovery |
| Can't monitor pages for changes | Visual diff + DOM change detection |
| Form filling is error-prone | AI understands form context, fills correctly |

## Browser Control Capabilities

```markdown
Navigation:
`browser navigate "https://example.com/login"`
`browser go-back`
`browser wait-for "div.content-loaded" --timeout 10000`

Element Interaction:
`browser click "Login button"`  (find by text, role, or AI)
`browser type "email@example.com" into "Email field"`
`browser select "Option 3" from "Country dropdown"`
`browser upload "report.pdf" to "Upload documents"`
`browser scroll "to bottom"`
`browser hover "Account menu"`
`browser check "I agree to terms"`

Data Extraction:
`browser extract "all product prices" from "div.pricing"`
`browser screenshot --full-page --output status.png`
`browser pdf --output page.pdf`
`browser get-html --selector "main.content"`
`browser get-text --selector "article"`

State Management:
`browser save-state --name "logged-in"`
`browser load-state --name "logged-in"`
`browser clear-cookies`
`browser set-local-storage '{"theme": "dark"}'`
```

## Smart Element Discovery

When CSS selectors fail, the AI fallback engine takes over:

```markdown
`browser click "{needle_in_haystack}"`

Selector resolution order:
1. Exact text match → "Login" button
2. Role/aria → button[role="submit"]
3. AI vision → Analyzes page screenshot, locates element visually
4. Semantic intent → "the button that says Login with Facebook"
5. Proximity → "the input below the label 'Email'"

Self-healing: If selector fails, AI captures page state,
re-analyzes, finds correct element, and retries automatically.
```

## Multi-Step Workflow Engine

```markdown
Define a workflow:
`browser workflow create --name "post-to-linkedin"`

Workflow steps:
1. navigate https://linkedin.com
2. load-state "linkedin-logged-in"
3. click "Start a post"
4. wait-for "div.editor" --timeout 5000
5. type "Excited to share our new..." into "Post editor"
6. click "Post" button
7. wait-for "Post successful" notification
8. save-screenshot --output linkedin_post.png

Execute workflow:
`browser workflow run "post-to-linkedin"`

Schedule workflow:
`browser workflow schedule "post-to-linkedin" --cron "0 9 * * 1-5"`
```

## Monitoring & Change Detection

```markdown
Page monitoring:
`browser monitor https://competitor.com/pricing --interval 1h --alert webhook`

Change detection types:
- Visual (screenshot diff)
- DOM (element added/removed/changed)
- Text (specific text changed)
- Price (number values tracked in time series)
- Availability (out of stock → in stock)

`browser monitor list` → Show active monitors
`browser monitor results --name "competitor-pricing"` → Show changes
```

## Anti-Detection & Proxy Management

```markdown
Browser fingerprinting protection:
`browser config set user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."`
`browser config set viewport 1920x1080`
`browser config set locale "en-US"`
`browser config set timezone "America/New_York"`
`browser config set geolocation "40.7128,-74.0060"`
`browser config set random-mouse-movements true`
`browser config set random-typing-speed true`

Proxy rotation:
`browser proxy set --type residential --rotate every-request`
`browser proxy set --type datacenter --rotate every-10-minutes`
`browser proxy set --type socks5 --host proxy.example.com --port 1080`

CAPTCHA handling:
- Detect CAPTCHA type (reCAPTCHA, hCaptcha, text, image)
- Auto-solve via 2Captcha/CAPSolver (if configured)
- Or rotate IP + retry with new session
```

## Multi-Tab & Multi-Window

```markdown
`browser tab new`
`browser tab list` → [Tab 1: amazon.com, Tab 2: google.com]
`browser tab switch 2`
`browser tab close 1`

Context isolation:
`browser context create --name "work"`
`browser context create --name "personal"`
`browser context switch "work"`
```

## Error Recovery

When a step fails, the recovery system activates:

```markdown
Recovery strategies (in order):
1. Retry with different selector strategy (AI fallback)
2. Wait + retry (network delay? 3s wait then retry)
3. Reload page + retry (stale state?)
4. New session + retry (session expired?)
5. Skip step + continue (non-critical step)
6. Abort workflow + report error

`browser workflow recovery --strategy aggressive` → Try all strategies
`browser workflow recovery --strategy conservative` → Only retry once

Error logging:
`browser workflow history --name "post-to-linkedin"`
→ Outputs full error trail with screenshots at each failure point
```

## Scripts

### scripts/browser.py
Core browser automation engine built on Playwright:
- `navigate` / `click` / `type` / `extract` / `screenshot`
- Workflow creation and execution
- Tab and context management
- State saving and loading

### scripts/monitor.py
Page monitoring and change detection:
- Visual diff engine (pixel comparison)
- DOM mutation tracking
- Price/availability trackers
- Alert routing (webhook, email, telegram)
- Historical data storage

### scripts/proxy_manager.py
Proxy and anti-detection management:
- Multiple proxy provider integrations
- CAPTCHA solving services
- Fingerprint randomization
- Session rotation strategies

## References

### references/selectors.md
Complete guide to element selection strategies: CSS selectors, XPath, text selectors, role selectors, AI vision-based selection with fallback chains.

### references/workflow_patterns.md
Common workflow patterns: login sessions, pagination, form filling, data extraction, file downloads, infinite scrolling, iframe handling, popup management.

### references/antidetection.md
Anti-detection guide: browser fingerprinting, CAPTCHA types and solving services, proxy configurations, rate limiting avoidance, and session management best practices.

---

**Quick start:** `browser navigate "https://example.com" && browser screenshot`
**Workflow:** `browser workflow run "daily-report" --schedule "0 8 * * *"`
**Monitor:** `browser monitor https://store.com/product-1 --watch price`
