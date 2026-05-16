---
name: api-marketplace-aggregator
description: API integration marketplace with discovery, pricing comparison, and unified billing. Use when agents need to find, compare, evaluate, integrate, or manage third-party API services for their workflows. Solves the "which API should I use and how do I manage 15 different API keys?" problem.
---

# API Marketplace Aggregator - Discover, Compare, Integrate APIs

## Overview

API Marketplace Aggregator is a comprehensive API discovery and management system for AI agents. It aggregates APIs from multiple marketplaces (RapidAPI, APILayer, ProgrammableWeb), compares pricing across providers, manages API keys, handles rate limiting, and generates integration code. Agents can find the best API for any task, compare costs, and integrate in one command.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Too many APIs, no easy comparison | Side-by-side pricing, features, limits |
| API keys scattered everywhere | Centralized key management (encrypted vault) |
| Rate limits cause failures | Smart throttling + queue management |
| Integration code takes hours | Auto-generated SDK snippets |
| API costs spiral out of control | Usage tracking + budget alerts |
| Hard to know which API is best | AI-powered recommendation engine |

## API Discovery

```markdown
Natural language search:
`api find "email verification service with good free tier"`
`api find "document OCR with handwriting recognition"`
`api find "SMS provider with US phone numbers"`

Search across:
- RapidAPI (30,000+ APIs)
- APILayer (50+ utility APIs)
- ProgrammableWeb (25,000+ APIs)
- GitHub API repos
- Direct API providers (Stripe, Twilio, SendGrid, etc.)

Results show: name, description, category, pricing tier, rating, latency SLA.
```

## Price Comparison Engine

```markdown
`api compare "email verification" --providers hunter,zerobounce,neverbounce,clearbit`

Output:
┌────────────────┬──────────┬──────────┬────────┬───────┐
│ Provider       │ Free Tier│ Paid From│ Accuracy│ Limit│
├────────────────┼──────────┼──────────┼────────┼───────┤
│ Hunter         │ 25/mo    │ $0.01/ea │ 95%    │ 500/d │
│ ZeroBounce     │ 100/mo   │ $0.008/ea│ 98%    │ 5000/d│ ← Best Value
│ NeverBounce    │ 0        │ $0.008/ea│ 97%    │ 1000/d│
│ Clearbit       │ 50/mo    │ $0.05/ea │ 96%    │ —     │
└────────────────┴──────────┴──────────┴────────┴───────┘

🏆 Recommendation: ZeroBounce (best accuracy/price ratio)
```

## Key Management Vault

```markdown
`api vault add sendgrid SENDGRID_API_KEY sg_abc123...`
`api vault add stripe STRIPE_SECRET_KEY sk_live_...`
`api vault list`
`api vault rotate sendgrid`  → Auto-rotate key

Vault features:
- Encrypted storage (AES-256-GCM)
- Environment variable injection
- Auto-rotation support
- Team sharing with permissions
- Audit log of key usage
- Emergency key revocation
```

## Integration Code Generator

```markdown
Generate integration code for any API:

`api integrate sendgrid --language python --template send-email`
`api integrate stripe --language python --template create-payment`
`api integrate twilio --language typescript --template send-sms`

Example output (Python):
```python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

message = Mail(
    from_email='sender@example.com',
    to_emails='recipient@example.com',
    subject='Sending with SendGrid is Fun',
    html_content='<strong>and easy to do anywhere, even with Python</strong>'
)

try:
    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    response = sg.send(message)
    print(f"Status: {response.status_code}")
except Exception as e:
    print(e.message)
```

Supports: Python, JavaScript/TypeScript, Go, Ruby, PHP, curl/bash.
```

## Rate Limit & Cost Management

```markdown
Smart throttler:
`api throttle --provider twilio --max-rpm 100`
`api throttle --provider openai --max-tpm 90000`

Budget controls:
`api budget set --provider sendgrid --monthly-limit 50`
`api budget set --provider all --monthly-limit 500`
`api budget alert --when 80% --channel telegram`

Usage tracking:
`api usage --daily`
`api usage --provider openai --since "2026-01-01"`
`api usage forecast --next-month`
```

## API Health Monitoring

```markdown
`api health check --providers sendgrid,stripe,twilio,openai`

Continuous monitoring:
- Response time tracking
- Uptime percentage
- Error rate per endpoint
- Latency percentile (p50, p95, p99)

`api health report --last-7d` → Weekly health report
`api health alert --webhook https://hooks.slack.com/...`
```

## API Marketplace Portfolio

Pre-configured API portfolio for common agent needs:

```markdown
Communication:
  • SendGrid (email) - 100 free/day
  • Twilio (SMS/voice) - Pay as you go
  • Telegram Bot API - Free

Data & Enrichment:
  • Hunter (email verify) - 25 free/mo
  • Clearbit (company data) - 50 free/mo
  • IPHub (proxy/VPN detect) - Free tier

AI & ML:
  • OpenAI (GPT-4) - Pay per token
  • Anthropic (Claude) - Pay per token
  • DeepL (translation) - 500k char free/mo

Monitoring:
  • Sentry (error tracking) - 5k events free/mo
  • Better Uptime (monitoring) - Free tier
  • Logtail (logging) - 1GB free/mo
```

## Scripts

### scripts/api_discovery.py
API search and comparison engine with marketplace aggregation and AI-powered recommendations.

### scripts/api_vault.py
Encrypted API key management with secure storage, environment injection, rotation, and audit logging.

### scripts/api_integrate.py
Integration code generator supporting Python, JS/TS, Go, Ruby, PHP with template library and context-aware code generation.

### scripts/api_monitor.py
Health monitoring, rate limit tracking, usage dashboards, and budget alerts with multi-channel notifications.

## References

### references/marketplaces.md
API marketplace directory with registration guides, pricing tiers, and best practices for RapidAPI, APILayer, ProgrammableWeb, GitHub API repos.

### references/pricing_models.md
Guide to API pricing models (per-request, per-record, subscription, tiered, freemium) with cost optimization strategies and provider comparison tables.

### references/integration_patterns.md
Common API integration patterns: webhook receivers, batch processing, streaming, CORS handling, OAuth flows, retry strategies, and pagination handling.

---

**Quick find:** `api find "email API"`
**Quick vault:** `api vault add myapi KEY_123`
**Quick integrate:** `api integrate stripe --language python`
**Quick monitor:** `api health check --all`
