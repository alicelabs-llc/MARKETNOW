---
name: agent-sentiment-orchestrator
description: Multi-channel sentiment analysis and response orchestration. Use when agents need to monitor brand mentions, analyze sentiment across social platforms and reviews, prioritize alerts, and trigger automated responses or human escalations. Solves the "I can't track what people are saying about my brand anywhere" problem.
---

# Agent Sentiment Orchestrator - Multi-Channel Brand Monitoring & Response

## Overview

Agent Sentiment Orchestrator is a comprehensive sentiment analysis and response system for AI agents. It monitors brand mentions across social media, review sites, forums, news, and customer support channels. Analyzes sentiment in real-time, prioritizes critical mentions, and orchestrates responses — from automated replies to human escalation. Built for brand managers, customer support agents, and reputation management bots.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Brand mentions scattered everywhere | Unified monitoring across 20+ channels |
| Can't respond fast to negative sentiment | Real-time alerts + auto-response templates |
| Sentiment analysis is too vague | Multi-dimensional sentiment (emotion, intent, urgency) |
| Crisis escalations get lost | Priority scoring → automatic escalation |
| Competitor mentions go unnoticed | Competitor brand tracking |
| Review management is full-time work | Auto-respond to reviews with brand voice |

## Supported Channels

```markdown
Social Media:
  Twitter/X • Reddit • LinkedIn • Facebook • Instagram • TikTok • YouTube • Discord • Telegram

Review Platforms:
  Google Maps/Reviews • Yelp • Trustpilot • G2 • Capterra • ProductHunt • App Store • Play Store

Forums & Communities:
  Hacker News • Stack Overflow • Quora • Medium • Subreddits • Discord Servers

News & Press:
  Google News • Bing News • RSS Feeds • Blog tracking • PRWeb

Customer Support:
  Email (support@) • Intercom/Zendesk • Live chat transcripts • Support tickets

Custom:
  Any webhook source • Any RSS feed • Any API endpoint
```

## Sentiment Analysis Engine

### Multi-Dimensional Sentiment

```markdown
Beyond positive/negative/neutral — analyzes:

Primary Sentiment:
- Positive / Negative / Neutral / Mixed
- With confidence score (0.0-1.0)

Emotion Detection:
- Anger, frustration, urgency
- Delight, gratitude, excitement
- Confusion, disappointment
- Sarcasm detection

Intent Classification:
- Complaint / Bug report
- Feature request / Suggestion
- Purchase intent / Consideration
- Churn risk / Cancellation threat
- Praise / Testimonial
- Question / Support request

Urgency Scoring:
- Critical: Crisis-level, needs immediate human response
- High: Angry customer, public complaint
- Medium: General complaint, question
- Low: Praise, neutral mention
- Info: Just collecting data
```

### Analysis Command

```markdown
Manual analysis:
`sentiment analyze "i hate this product it never works"`
→ Sentiment: Negative (0.92)
→ Emotion: Anger (0.78), Frustration (0.65)
→ Intent: Complaint
→ Urgency: High
→ Suggested Response: Apologize + troubleshoot + offer solution

Batch analysis:
`sentiment analyze-batch --file mentions.csv`
`sentiment analyze-latest --channel twitter --limit 50 --since 1h`
```

## Alerting & Escalation

```markdown
`sentiment alert create --condition "sentiment < -0.7 AND urgency > 0.8" --action "escalate-human"`

Alert actions:
- Notify (telegram, slack, email, webhook)
- Auto-respond (send template-based reply)
- Escalate (create ticket in Zendesk/Intercom)
- Log (save to database for analysis)
- Ignore (suppress if known spam)

Escalation tiers:
  Tier 0: Auto-response (low/medium urgency, standard issues)
  Tier 1: Agent drafts response, user reviews (high urgency)
  Tier 2: Direct human escalation (critical, crisis)
  Tier 3: Executive alert (PR crisis, legal risk)

Multi-channel alert routing:
- Critical: SMS + phone call to on-call manager
- High: Slack/Telegram alert with mention
- Medium: Email digest
- Low: Weekly summary report
```

## Response Orchestration

```markdown
Auto-response templates:
`sentiment response create --trigger "negative:complaint" --template apology-v2`
`sentiment response create --trigger "positive:praise" --template thank-you`
`sentiment response create --trigger "question:feature" --template feature-roadmap`

Response flow:
1. Mention detected → 
2. Sentiment analyzed → 
3. Auto-response matched (if applicable) →
4. Response drafted with brand voice →
5. Human approves (Tier 1) or auto-send (Tier 0) →
6. Response logged →
7. Follow-up scheduled

Platform-specific response formatting:
- Twitter: Short, public first, then DM if sensitive
- Reddit: Acknowledge the subreddit culture, don't sound corporate
- Review sites: Thank + apologize + make it right publicly
- Support: Full solution, case number, SLA
```

## Dashboard & Reporting

```markdown
Real-time dashboard:
`sentiment dashboard`

Key metrics:
╔═══════════════════════╤═════════════════╗
║ Metric                │ Value            ║
╠═══════════════════════╪══════════════════╣
║ Total Mentions (24h)  │ 847              ║
║ Sentiment Score       │ 0.72 (Positive)  ║
║ Response Rate         │ 94%              ║
║ Avg Response Time     │ 12 min           ║
║ Escalations Pending   │ 3                ║
║ Trending Topics       │ pricing, bug v2.1║
╚═══════════════════════╧══════════════════╝

Reports:
`sentiment report --daily`
`sentiment report --weekly --format pdf`
`sentiment report --competitor "competitor_brand" --compare 30d`
`sentiment export --csv --since "2026-01-01" --sentiment "negative"`
```

## Competitor Tracking

```markdown
`sentiment competitor add "rival_company_name"`
`sentiment competitor compare --since 30d`

Compare:
- Your sentiment vs competitor sentiment
- Your response rate vs competitor
- Volume of mentions comparison
- Topic overlap analysis
- Share of voice (your brand vs competitors)

Competitor intelligence:
- Which features do customers wish they had?
- What are competitors' biggest complaints?
- Where are competitors being praised (their strengths)?
- Pricing sentiment comparison
```

## Scripts

### scripts/sentiment_engine.py
Core sentiment analysis:
- `analyze` - Single mention analysis
- `analyze-batch` - Batch processing
- `monitor` - Continuous channel monitoring
- `alert` - Alert rule management
- `response` - Response orchestration

### scripts/channel_connectors.py
Channel-specific connectors for all 20+ supported platforms with authentication, rate limiting, and webhook management.

### scripts/reporting.py
Dashboard and report generation:
- Real-time dashboards
- Daily/weekly/monthly reports
- Competitor comparisons
- Trend analysis
- Custom report builder

## References

### references/response_playbook.md
Complete response playbook with templates for every sentiment type and channel. Includes crisis response protocol, apology frameworks, FAQ responses, and brand voice guidelines by platform.

### references/monitoring_setup.md
Step-by-step setup guide for each supported channel: API keys needed, webhook configuration, OAuth flows, search query optimization, and rate limit management.

### references/sentiment_models.md
Sentiment model selection guide: pre-built vs custom models, multilingual support, domain-specific models (SaaS, retail, healthcare), and fine-tuning instructions.

---

**Quick start:** `sentiment monitor --channels twitter,reddit --brand "MyBrand"`
**Crisis check:** `sentiment dashboard`
**Auto-respond:** `sentiment response enable --level 0`
**Report:** `sentiment report --daily --email team@example.com`
