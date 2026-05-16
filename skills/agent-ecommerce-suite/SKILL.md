---
name: agent-ecommerce-suite
description: Full-stack ecommerce management for AI agents. Use when agents need to create, manage, and optimize online stores, process orders, handle inventory, manage customers, and run marketing campaigns. From store setup to customer support, this skill runs the entire ecommerce operation autonomously.
---

# Agent Ecommerce Suite - Autonomous Online Store Management

## Overview

Agent Ecommerce Suite is a complete ecommerce operating system for AI agents. It manages the full lifecycle: store creation, product listing, inventory management, order processing, customer management, marketing automation, and analytics. Supports Shopify, WooCommerce, and custom storefronts with a unified command interface.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Store setup takes days | One-command store creation with templates |
| Inventory sync across channels | Centralized inventory with auto-sync |
| Order management is manual | Auto-pick, pack, ship workflows |
| Customer support drains time | AI auto-responder with order lookup |
| Marketing needs constant attention | Automated campaign management |
| Multi-store management is a nightmare | Unified dashboard across all stores |

## Store Management

### Store Creation
```markdown
`store create --platform shopify --name "AI Store" --niche "digital products"`
`store create --platform woocommerce --domain mystore.com --host digitalocean`

Auto-provisions:
- Store configuration (shipping, taxes, payments)
- Theme installation (optimized for conversion)
- Product categories based on niche
- Default policies (returns, shipping, privacy)
- Initial product import (if provided)
- Analytics setup (Google Analytics, Facebook Pixel)
```

### Product Management
```markdown
`store products add --title "AI Prompt Bundle v2" --price 29.97 --category "digital/templates"`

`store products bulk-import products.csv` (CSV with title, desc, price, images, variants)

`store products update --sku PROMPT-002 --price 24.97 --stock 50`

`store products optimize --all` → AI-optimize titles, descriptions, and meta fields

Product features:
- Variant management (size, color, format)
- Digital file upload/storage
- SEO meta fields auto-generation
- Image optimization (compress, resize, alt text)
- Inventory tracking across warehouses
- Bundles & discounts
```

### Inventory Management
```markdown
`store inventory check --sku PROMPT-002` → Current stock: 45
`store inventory alert --low-stock 10 --channel telegram`
`store inventory sync --channels shopify,etsy,amazon`

Multi-channel inventory:
- Real-time sync between channels
- Prevent overselling with single source of truth
- Auto-pause listings when stock = 0
- Restock suggestions based on sales velocity
```

## Order Processing

```markdown
`store orders list --status pending --limit 10`
`store orders process --order-id ORD-1234` → Full workflow

Auto-fulfillment:
1. Payment confirmed → 2. Digital assets prepared
3. Email sent with download link → 4. Inventory deducted
5. Order marked as fulfilled → 6. Tracking created
7. Post-purchase email sequence triggered

`store orders fulfillment --auto` → Auto-fulfill all paid digital orders
`store orders fulfillment --manual --shipper "USPS"` → For physical goods

Order management:
- Bulk order processing (50+ orders at once)
- Refund/return handling
- Order notes and history
- Customer lookup by email/order number
- Abandoned cart recovery emails
```

## Customer Management

```markdown
`store customers list --segment vip --since 30d`
`store customers lookup email@example.com`
`store customers segments` → Auto-generated segments

Segments:
- VIP (spent >$500)
- New (first purchase <30 days)
- At-risk (no purchase 90 days)
- Win-back (no purchase 180 days)
- Cart abandoners
- High LTV (top 10% spenders)

`store customers email-campaign --segment vip --template "early-access"`
`store customers export --segment all --format csv`
```

## Marketing Automation

### Email Campaigns
```markdown
`store campaign create --type abandoned-cart --wait 1h`
`store campaign create --type welcome --trigger purchase --delay 0`
`store campaign create --type upsell --trigger purchase --delay 7d`

Pre-built flows:
- Welcome series (5 emails over 14 days)
- Abandoned cart (3 emails over 48 hours)
- Post-purchase (5 emails over 30 days)
- Win-back (3 emails over 21 days)
- Birthday/anniversary (1 email + coupon)
- Replenishment reminders (for consumables)
```

### Discount & Coupon Engine
```markdown
`store coupon create --code SAVE20 --percent 20 --min-order 50`
`store coupon create --code FREESHIP --free-shipping --expires 2026-04-01`
`store coupon create --code BUNDLE15 --type bundle --products PROMPT-001,PROMPT-002`

Auto-optimization:
- AI suggests optimal discount rates
- A/B test coupon codes
- Minimum order value optimization
- Coupon stacking rules
- Abuse prevention (1 per customer)
```

## Analytics Dashboard

```markdown
`store analytics summary` → Today's overview
`store analytics report --type sales --period 30d`
`store analytics products --top 10`
`store analytics customers --cohort`

Key metrics tracked:
╔════════════════╤══════════╤══════════╗
║ Metric         │ Today    │ vs. Yesterday ║
╠════════════════╪══════════╪══════════╣
║ Revenue        │ $1,234   │ +12%     ║
║ Orders         │ 47       │ +8%      ║
║ AOV            │ $26.26   │ +3%      ║
║ Conversion     │ 2.8%     │ +0.3%    ║
║ Traffic        │ 1,672    │ +5%      ║
╚════════════════╧══════════╧══════════╝

`store analytics export --format pdf --email daily@report`
```

## Scripts

### scripts/store_manager.py
Core store operations:
- `create` - Create and configure store
- `products` - Product CRUD and optimization
- `inventory` - Multi-channel stock management
- `orders` - Order processing and fulfillment
- `customers` - Customer management and segments

### scripts/marketing_engine.py
Marketing automation:
- `campaign` - Campaign creation and management
- `coupon` - Discount/coupon management
- `emails` - Email sequence templates and automation
- `analytics` - Performance reporting

### scripts/abandoned_cart_capturer.py
Dedicated abandoned cart recovery with timing optimization, personalized offers, and multi-channel followup (email + SMS).

## Assets

### assets/email_templates/
Pre-built HTML email templates for:
- abandoned_cart.html
- welcome.html
- order_confirmation.html
- shipping_update.html
- win_back.html
- review_request.html
- birthday_coupon.html

### assets/store_themes/
Conversion-optimized store themes for Shopify and WooCommerce.

## References

### references/store_setup.md
Complete store setup guide for Shopify, WooCommerce, and custom storefronts with platform-specific configurations, payment gateway setup, tax configuration, and shipping rules.

### references/marketing_strategies.md
Ecommerce marketing playbook: acquisition channels, conversion optimization, email marketing strategies, social commerce, and paid ad management.

### references/compliance.md
Ecommerce legal compliance: GDPR for EU customers, CCPA for California, VAT/GST handling, digital product taxation, terms of service templates, and privacy policy templates.

---

**Quick start:** `store create --platform shopify --name "MyDigitalStore" --niche templates`
**Product upload:** `store products bulk-import products.csv`
**Auto-pilot:** `store campaign enable-all`
**Daily briefing:** `store analytics summary`
