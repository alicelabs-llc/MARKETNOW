---
name: agent-pricing-engine
description: Dynamic pricing engine for AI agents that sell services. Use when your agent needs to price its work, calculate rates based on complexity/time/volume, generate quotes, negotiate terms, or implement value-based pricing. Solves the "how much do I charge?" problem for autonomous agents.
---

# Agent Pricing Engine - Autonomous Value & Rate Calculator

## Overview

Agent Pricing Engine enables AI agents to dynamically price their own services. Instead of hard-coding prices, agents using this skill analyze task complexity, estimate effort, check market rates, and generate optimized pricing in real-time. Supports hourly, project-based, value-based, and subscription pricing models with automatic discounting, bundling, and negotiation logic.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Agent doesn't know what to charge | Dynamic pricing based on complexity + market data |
| One-size-fits-all pricing leaves money on the table | Value-based pricing for each service type |
| No competitor rate awareness | Live market rate API lookup |
| Can't negotiate or offer discounts | Built-in negotiation engine with floor prices |
| Service bundling is manual | Auto-bundle engine with optimal discount math |
| Subscription pricing math is complex | Tier calculator with LTV projections |

## Pricing Models

### 1. Hourly Rate Model
```
Base Rate = Skill Premium × Experience Factor × Market Adjustment × Urgency Multiplier
```

**Skill Premium Table:**
| Skill Level | Multiplier | Example Rate (Base $50) |
|-------------|-----------|------------------------|
| Basic (automation, data entry) | 1.0x | $50/hr |
| Intermediate (integration, dev) | 1.5x | $75/hr |
| Advanced (ML, architecture) | 2.5x | $125/hr |
| Expert (research, strategy) | 4.0x | $200/hr |
| Niche Specialist | 3.0-8.0x | $150-400/hr |

### 2. Project-Based Pricing
```
Project Price = (Estimated Hours × Hourly Rate) × Complexity Factor + Fixed Costs + Risk Premium
```

| Complexity | Factor | Description |
|------------|--------|-------------|
| Simple | 0.8x | Well-defined, repeatable |
| Moderate | 1.0x | Standard complexity |
| Complex | 1.5x | Multiple unknowns |
| Research-grade | 2.5x | Novel, requires exploration |

### 3. Value-Based Pricing (Recommended)
```
Value Price = Customer Savings × Value Capture % + Outcome Premium
```

Agent analyzes the customer's problem and prices based on **value delivered**:
- **Cost savings:** 20-30% of what the customer would spend otherwise
- **Revenue generation:** 10-20% of projected first-year revenue impact
- **Risk reduction:** Fixed premium based on liability averted
- **Time savings:** Priced at customer's hourly rate × hours saved × 50%

### 4. Subscription Tiering
```
Monthly Price = Service Cost × Margin Target + Retention Discount
Annual Price = Monthly × 10 (2 months free)
```

**Tier Generator:**
| Tier | Features | Price Range | Target |
|------|----------|-------------|--------|
| Free | 5 tasks/month, basic | $0 | Acquisition |
| Starter | 50 tasks, standard | $29-49/mo | SMB |
| Pro | Unlimited, priority | $97-197/mo | Power users |
| Enterprise | SLA, dedicated | $497-1997/mo | Companies |

## Quote Generation Workflow

```markdown
Step 1: Analyze Request
  `pricing analyze "write a 10,000 word ebook about keto diet"`

Step 2: Complexity Assessment
  Agent auto-classifies: Content Creation > Long-form > Niche Research
  → Complexity: Moderate (1.0x)
  → Estimated effort: 15-20 hours

Step 3: Market Rate Check
  `pricing market-check "ebook ghostwriting keto health"` 
  → Market range: $500-$2,500
  → Agent positions at $1,200-$1,800 (premium position)

Step 4: Generate Quote
  `pricing quote --project "ebook keto diet" --value 1800 --deliverables "10k words, 5 revisions, SEO optimized"`

Step 5: Optional Negotiation
  `pricing negotiate --floor 1200 --current-offer 1500`
  → Agent can offer 10-15% discount or add bonus deliverables
```

## Discount Rules Engine

```yaml
discount_rules:
  new_customer:
    first_order: 15% (up to $200 max)
    referral: 20%
  loyalty:
    3+ projects: 10%
    10+ projects: 20%
  volume:
    bundle_2+: 15% per item
    bundle_5+: 25% per item
  urgency:
    standard: 0%
    rush: +25% premium
    super_rush: +50% premium
  seasonal:
    q4_holiday: 10%
    new_year: 15%
```

## Negotiation Engine

The engine follows a structured negotiation protocol:

```markdown
1. Initial Offer: Quote at 80-90th percentile of market
2. First Counter: If customer balks, offer 10% discount OR add bonus
3. Second Counter: If still hesitant, drop to floor price + remove extras
4. Walk Away: Below floor price → decline politely with referral

The agent NEVER drops below floor price (configured per service type).
```

## Billing & Invoicing Integration

```markdown
Generate invoice:
`pricing invoice generate --quote-id q_abc123 --payment-terms "net15"`

Payment methods supported:
- Stripe (direct integration)
- PayPal (checkout link)
- Crypto (USDC on Base/Mainnet)
- Invoice (email PDF)

Auto-payment reminders:
- Day 0: Invoice sent
- Day 7: Friendly reminder
- Day 14: Final notice (if net15)
- Day 20: Service suspension notice
```

## Pricing Scripts

### scripts/pricing_engine.py
Core pricing calculator with:
- `quote` - Generate detailed quote
- `negotiate` - Handle price negotiation
- `market-check` - Lookup market rates
- `analyze` - Analyze task for complexity/effort
- `invoice` - Generate invoice
- `tiers` - Generate subscription tiers

### scripts/market_intel.py
Market rate intelligence:
- Scrape freelancer platforms (Upwork, Fiverr, Freelancer)
- Cache market rates locally
- Adjust for geography/cost of living
- Track rate trends over time

## References

### references/pricing_strategies.md
Complete guide to all pricing models with case studies, negotiation scripts, and industry-specific rates for software dev, content, design, data science, consulting.

### references/invoice_templates.md
Invoice and quote templates for Stripe, PayPal, and manual PDF generation.

---

**Activation:** `pricing init --service-type "developer" --base-rate 75`
**Quick quote:** `pricing quote --project "build landing page" --estimate 8h`
**Market check:** `pricing market-check "python developer freelance rates"`
