---
name: lead-generation-automation
description: Automated B2B/B2C lead generation and enrichment system. Use when agents need to find prospects, scrape contact data, enrich profiles, score leads, and build targeted outreach lists. Solves the "I need leads but manual prospecting takes all day" problem for sales-oriented agents.
---

# Lead Generation Automation - Autonomous Prospect Discovery & Enrichment

## Overview

Lead Generation Automation gives AI agents the ability to autonomously discover, research, enrich, and score B2B and B2C leads across multiple sources. The system combines web scraping, API integrations, data enrichment, and AI-driven qualification to deliver ready-to-contact prospect lists. Built for sales agents, marketing agents, and business development bots.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Manual prospecting takes hours daily | Autonomous lead discovery engine |
| Contact data is outdated or wrong | Multi-source enrichment + verification |
| Hard to score which leads matter | AI qualification scoring (firmographic + intent) |
| Building lists from scratch each time | Persistent CRM with auto-updates |
| No way to find leads on autopilot | Scheduled daily/weekly lead runs |
| Data scattered across 10 sources | Unified enrichment pipeline |

## Lead Sources

### Web Sources
| Source | Method | Data Retrieved |
|--------|--------|----------------|
| LinkedIn (Company Search) | Browser automation or API | Company, industry, size, location |
| LinkedIn (People Search) | Browser automation | Name, title, company, connections |
| Google Maps | Scrape | Business name, phone, website, reviews |
| Crunchbase | API | Funding, founders, category, growth |
| AngelList | API | Startup profiles, roles, funding |
| BuiltWith | API | Tech stack, technologies used |
| SimilarWeb | API | Traffic, competitors, audience |
| Yellow Pages / Yelp | Scrape | Contact info, category, location |
| Industry Directories | Scrape | Specialized B2B data |

### Data Sources
| Source | Enrichment Type | Coverage |
|--------|-----------------|----------|
| Hunter.io | Email discovery | 100M+ verified emails |
| Apollo.io | Full contact enrichment | 275M+ contacts |
| Clearbit | Company enrichment | 20M+ companies |
| RocketReach | Contact finding | 700M+ profiles |
| PeopleDataLabs | Professional data | 1B+ person records |

## Lead Discovery Pipeline

```markdown
Step 1: Define Target Profile
  `leads define --industry "SaaS, fintech" --size "10-50 employees" --location "US" --title "CEO, CTO, Head of Product"`
  
  Or use natural language:
  `leads define "Find Series A funded fintech startups in NYC with 5-20 employees"`

Step 2: Source Discovery
  `leads discover --sources linkedin,crunchbase,maps --limit 200`
  
  Auto-searches across selected sources, deduplicates, and compiles raw prospects.

Step 3: Enrich Contacts
  `leads enrich --fields email,phone,linkedin_url --method hunter,apollo`
  
  Enrichment adds: verified email, phone, social links, tech stack, funding info.

Step 4: Score & Qualify
  `leads score --model b2b-saas --min-score 75`
  
  Scoring factors:
  - Fit score: Industry, size, title alignment (40%)
  - Intent score: Recent hiring, tech adoption, funding (30%)
  - Engagement score: Email valid, social active, content shares (20%)
  - Priority score: Time-sensitivity, budget match (10%)

Step 5: Export
  `leads export --format csv --fields name,email,company,score,source`
  
  Formats: CSV, JSON, Google Sheets, HubSpot import, Salesforce import
```

## Lead Scoring Model

```yaml
scoring_model:
  fit:
    industry_match: 15
    company_size_match: 10
    title_relevance: 10
    location_match: 5
  intent:
    recent_funding: 10
    tech_stack_growth: 8
    hiring_activity: 7
    website_content_change: 5
  engagement:
    email_verified: 8
    linkedin_active: 5
    content_creation: 4
    conference_attendance: 3
  priority:
    budget_estimate: 5
    decision_maker_role: 5
    timeline_urgency: 3

thresholds:
  hot: 85-100 → Immediate outreach
  warm: 65-84 → Add to sequence
  cold: 40-64 → Nurture
  discard: 0-39 → Archive
```

## Outreach Integration

```markdown
After lead generation, integrate with outreach tools:

Email sequences:
`leads outreach --list leads_hot.csv --sequence cold-email-v2 --sender-name "AI Sales Bot"`

CRM sync:
`leads sync hubspot --list leads_warm.csv`
`leads sync salesforce --list leads_hot.csv`

LinkedIn automation:
`leads linkedin-connect --list leads_hot.csv --personalized-template "Saw you're working on [company] and loved [specific detail]"`
```

## Scheduled Runs (Autopilot)

```markdown
Schedule daily discovery:
`leads schedule --daily --profile "saas-ceo-us" --sources linkedin,crunchbase`

Schedule weekly enrichment:
`leads schedule --weekly --command enrich --profile "all-prospects"`

Results delivered as:
- Email digest every morning
- CSV dropped to workspace
- CRM auto-updated
- Slack/Telegram notification on hot leads
```

## Compliance & Ethics

```markdown
`leads compliance-check --list prospects.csv`

GDPR: 
- EU prospects auto-flagged
- Consent tracking required
- Right-to-deletion handlers

CAN-SPAM:
- Unsubscribe links required
- Sender identification in every email
- Opt-out honored within 10 business days

CCPA:
- California residents identified
- Data deletion request handlers

Best practice: Always include opt-out mechanism and maintain suppression list.
```

## CRM & Data Management

```markdown
`leads crm init` → Initialize local prospect database
`leads crm add prospect_name --company "Acme Corp"` → Manual Add
`leads crm merge --dedup` → Deduplicate by email/domain
`leads crm tag hot-prospects` → Segment/tag
`leads crm stats` → Pipeline overview

Data freshness:
- Re-verify emails every 90 days
- Re-score leads weekly
- Remove bounces automatically
```

## Scripts

### scripts/leads_engine.py
Core lead management:
- `define` - Create target profiles
- `discover` - Multi-source prospect discovery
- `enrich` - Contact data enrichment
- `score` - AI lead scoring
- `export` - Export in multiple formats
- `outreach` - Generate outreach sequences

### scripts/enrichment_pipeline.py
Contact enrichment with support for Hunter, Apollo, Clearbit, RocketReach, and PeopleDataLabs APIs. Smart fallback between sources.

### scripts/crm_manager.py
Local SQLite CRM with sync adapters for HubSpot, Salesforce, and Google Sheets.

## References

### references/sources.md
Complete guide to available data sources, their rate limits, API keys needed, costs, and best practices for each source (scraping guidelines, API quotas).

### references/outreach_templates.md
Email and LinkedIn outreach templates for cold, warm, and hot leads with personalization variables and A/B testing frameworks.

### references/compliance.md
GDPR, CAN-SPAM, and CCPA compliance guide for lead generation including region detection, consent management, and data deletion workflows.

---

**Quick start:** `leads define "fintech startups SF series A" && leads discover && leads enrich`
**Autopilot:** `leads schedule --daily --profile "b2b-saas-ceo"`
**Export:** `leads export --format csv`
