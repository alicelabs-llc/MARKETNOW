---
name: multi-platform-publisher
description: "Complete digital product publishing across Amazon KDP, Gumroad, Hotmart, and Shopify. Use when: (1) Publishing ebooks, paperbacks, or coloring books to KDP, (2) Setting up Gumroad storefront for digital downloads (templates, Notion kits, presets, software), (3) Creating and launching Hotmart infoproducts (courses, memberships, coaching), (4) Building Shopify digital product listings, (5) Generating all listing assets (covers, previews, descriptions, keywords) via AI, (6) Running cross-platform launch campaigns with timing coordination."
---

# Multi-Platform Publisher

## Overview

Publish digital products across **4 platforms simultaneously** — Amazon KDP, Gumroad, Hotmart, and Shopify. This skill handles the **full lifecycle**: market research → product creation → asset generation → listing optimization → cross-platform launch sequencing → performance tracking.

**Core Philosophy:** Create once, publish everywhere. Each platform gets optimized listings that respect its algorithm, audience, and content rules.

## Quick Start Decision Tree

```
User wants to publish something?
│
├── "I have a book/manuscript" → KDP Track (ebook + paperback)
│
├── "I have a digital file/download" → Gumroad Track (templates, presets, software, Notion kits)
│
├── "I have a course/coaching program" → Hotmart Track (infoproducts, memberships)
│
├── "I have physical + digital products" → Shopify Track (hybrid store)
│
├── "Launch on all platforms" → CROSS-PLATFORM LAUNCH (read references/cross-platform-strategy.md)
│
└── "I have an idea, research the market" → MARKET RESEARCH (read references/nichos-rentables.md)
```

---

## 1. Amazon KDP Publishing Track

### 1.1 Pre-Publishing Research
Use scripts/research_kdp.py to:
- Analyze niche competition (top 100 BSR, review count distribution)
- Find keyword gaps with low competition, high demand
- Identify underserved subcategories
- Scan Amazon frontmatter/bestseller patterns

**Always run:** `scripts/research_kdp.py --niche "<niche>"` before creating any KDP listing.

### 1.2 Book Formatting & Interior
- **Interiors:** Use `scripts/generate_interior.py` for coloring books, journals, workbooks, and lined notebooks
- **Bleed settings:** Always set `--bleed 0.125` for print books under 100 pages
- **Trim sizes:**
  - Coloring books: 8.5"x11"
  - Low-content: 6"x9" or 7.5"x9.25"
  - Novels: 5.5"x8.5" or 6"x9"

### 1.3 Cover Generation
Use `scripts/generate_cover.py` for:
- Wraparound covers with correct spine width calculation
- Kindle MatchBook-compatible JPEG renders
- CMYK conversion for print (Proof required: convert to PDF/X-1a)

### 1.4 KDP Listing Optimization
Rules for each listing element:

**Title formula:** `[Primary Keyword] - [Benefit/Format] [Secondary Keyword]`
- Max 200 chars (Amazon KDP)
- Include format: "Coloring Book", "Workbook", "Journal"
- Top keywords must appear in title

**Subtitle (optional):** Add benefit + secondary keywords. Max 200 chars.

**Description:** A+ Content style with emojis and line breaks
```
🎯 [Hook - 1 sentence problem/desire]
✅ [3-4 bullet features]
📖 [What's inside]
📏 Product Details: trim, page count
📈 Scroll up and click "Buy Now"!
```
- Keywords from backend hidden fields woven naturally into description body
- No HTML (KDP converts plain text; keep it scannable)

**7 Backend Keywords:** Use 7 key phrases, 249 chars each. No commas. Group by intent:
- Identify: "adult coloring book animals stress relief"
- Qualify: "intricate mandala coloring book for adults anxiety"
- Convert: "relaxing coloring books for adults mindfulness meditation"

**Categories:** Select 2-3 that match BSR competition:
- Under 100 BSR → Avoid (too competitive)
- 100-500 BSR → Targetable
- 500+ BSR → Easy ranking

### 1.5 KDP Pricing Strategy
| Format | Price Range | Royalty (70% / 35%) |
|--------|-------------|-------------------|
| eBook $2.99-$9.99 | 70% royalty tier | Max profit |
| eBook <$2.99 or >$9.99 | 35% royalty | Avoid |
| Paperback | Cost + 40% margin | ~60% |
| Hardcover | Cost + 50% margin | ~55% |

### 1.6 Use Scripts
```bash
# Research a niche
py scripts/research_kdp.py --niche "adult coloring books animals"

# Generate interior (coloring book)
py scripts/generate_interior.py --type coloring --pages 100 --trim 8.5x11 --bleed 0.125

# Generate cover
py scripts/generate_cover.py --title "My Book" --subtitle "Subtitle" --author "Author" --trim 8.5x11 --pages 100

# Generate listing
py scripts/generate_listing.py --niche "animals coloring book" --keywords-file keywords.txt --format ebook

# Category finder
py scripts/find_categories.py --niche "coloring books for adults"
```

---

## 2. Gumroad Digital Store

### 2.1 Products That Sell Best on Gumroad
- **Templates** (Notion, Airtable, Excel, Figma)
- **Presets** (Lightroom, CapCut, DaVinci)
- **Software assets** (UI kits, icon packs, fonts)
- **Digital planners** (PDF fillable, GoodNotes compatible)
- **AI prompts** (ChatGPT prompt packs, Midjourney style packs)
- **Ebooks** (PDF format, short reads)
- **Courses** (video + workbook bundles)

### 2.2 Gumroad Listing Structure
**Product name:** Clear benefit + format. E.g., "50 AI Prompts for Marketing [Notion Template]"

**Description format:**
```
# [Product Name]

## What You Get
- [Asset 1] with X items
- [Asset 2] with Y formats
- [Bonus 1] included free

## Who Is This For?
- [Persona 1]
- [Persona 2]

## What You'll Need
- Software/account requirements

## Refund Policy
100% satisfaction guarantee. [X] day money-back.
```

**Tags:** Use all 5 available. Mix broad (>10k searches) + specific (<500 searches).

**Pricing:** 
- $3-$15 for templates/presets
- $15-$49 for bundles
- $47-$197 for courses
- Use structured pricing (fractional pricing like $9.97, $19.47)

### 2.3 Gumroad Email Sequence (Automatic)
Set up **3 email sequence**:
1. **Welcome + delivery link** (auto) + upsell at 50% off
2. **Day 3:** Tips/use case for the product + social share request
3. **Day 7:** Related product recommendation + affiliate program invite

---

## 3. Hotmart Infoproduct Launch

### 3.1 Product Types on Hotmart
- **Online courses** (video + PDF)
- **Memberships** (recurring billing, community access)
- **Coaching programs** (limited seats, high ticket)
- **Digital downloads** (ebooks, templates)
- **Events** (webinars, workshops)

### 3.2 Hotmart Listing Optimization
**Title:** [Benefit-driven] + [Format]. Max 80 chars.
**Subtitle:** Expand benefit + target audience.
**Description structure:**
```
## 🎯 Who Is This For?
## ✅ What Will You Achieve?
## 📚 Module Breakdown
## 🏆 What's Included
## ❓ FAQ
## ⭐ Testimonials
## 🛡️ 7-Day Money Back Guarantee
```

**Sales page sections that convert:**
1. **Hook** (3 lines max) - Pain → Solution → Transformation
2. **Problem aggravation** (2-3 paragraphs)
3. **Solution presentation** (features → benefits)
4. **Curriculum** (module names + what they unlock)
5. **Social proof** (testimonials, student count, ratings)
6. **Bonuses** (limited time urgency)
7. **Guarantee reversal** ("Try it risk-free")
8. **CTA** (clear, single action)

### 3.3 Hotmart Pricing Tiers
| Tier | Price | Commission | Strategy |
|------|-------|-----------|----------|
| Entry | $27-$67 | 50-60% | Lead generation |
| Core | $97-$197 | 50-70% | Main product |
| Premium | $297-$997 | 30-50% | Coaching/mentorship |
| Membership | $27-$97/mo | 40-60% | Recurring revenue |

### 3.4 Affiliate Recruitment
- Set affiliate commission at **50-60%** to attract top affiliates
- Provide email swipes, social posts, banner ads in producer area
- Create **5-day affiliate challenge** (email sequence + prizes)

---

## 4. Shopify Digital Products

### 4.1 Digital Product Types on Shopify
- Downloads (PDFs, templates, software)
- Print-on-demand (POD-integrated with Printful/Printify)
- Physical + digital bundles
- Subscription boxes

### 4.2 Shopify SEO for Digital Products
- **Product title:** Primary keyword at start. 60 chars for search.
- **Meta description:** 155-160 chars with keyword + benefit + CTA
- **Product description:** Use structured data (schema markup)
- **Collections:** Create by product type, use case, bestseller, and price
- **Image alt text:** Every image needs keyword-rich alt text

### 4.3 Shopify Pricing
- Digital products: $5-$50 (sweet spot $9-$29)
- Subscriptions: $9-$47/month with annual discount (20% off)
- Bundles: Daily equivalent saved pricing
- Use "Pay What You Want" for lead generation

---

## 5. Cross-Platform Launch Strategy

See `references/cross-platform-strategy.md` for:
- **Timing:** Hotmart launches 5 days before KDP for review window
- **Bundles:** Same content repurposed for each platform's format
- **Pricing parity:** Don't price differently on platforms (customers compare)
- **Cross-promotion:** Insert links to other platforms in product descriptions
- **Analytics:** UTM parameters for every external link

### Launch Sequence Timeline
```
[Day -14] Market research on all platforms
[Day -10] Create core content (manuscript/course)
[Day -7] Generate platform-specific versions
[Day -5] Create assets (covers, previews, videos)
[Day -3] Write listings, set up email sequences
[Day -1] Gumroad goes live (fastest approval)
[Day 0] Hotmart goes live (approval in hours)
[Day +1] KDP submitted (3-day review)
[Day +3] KDP goes live (paperback + ebook)
[Day +5] Shopify goes live
[Day +7] Affiliate recruitment begins
[Day +14] Performance review and optimization
```

---

## 6. Asset & AI Generation Pipeline

### Covers (for all platforms)
Use `scripts/generate_cover.py` with the AI image model:
- **KDP:** Full wraparound (front + back + spine), 300 DPI, CMYK, size = trim + bleed
- **Gumroad/Hotmart:** 1280×720px thumbnail with bold text overlay
- **Shopify:** 1024×1024px square, white background variant + lifestyle variant

**Cover design principles:**
- Readable at thumbnail size (20px height on mobile)
- One focal point (person/object/text hierarchy)
- 3 color maximum (complementary or analogous palette)
- Clear benefit statement in title text

### Preview/Content Sampler
- **KDP:** Kindle Previewer generated preview (first 10% of book)
- **Gumroad:** 5-page PDF preview of the product
- **Hotmart:** 3-minute video trailer
- **Shopify:** Product video (15-30s loop)

---

## Resources

### scripts/
- **`research_kdp.py`** - KDP niche research: competition analysis, keyword gaps, BSR data
- `generate_interior.py` - Generate print-ready interiors (coloring books, journals, workbooks)
- `generate_cover.py` - Generate covers with correct dimensions/spine calculation
- `generate_listing.py` - Generate optimized KDP/Gumroad/Hotmart listings with keywords
- `find_categories.py` - Find best KDP categories by niche
- `cross_platform_sync.py` - Sync pricing, descriptions, and assets across platforms

### references/
- `nichos-rentables.md` - Currently profitable niches across all 4 platforms
- `cross-platform-strategy.md` - Detailed launch timing, bundling, and cross-promotion guide
- `kdp-best-practices.md` - Deep KDP optimization (categories, A+ Content, KDP Select)
- `hotmart-launch-checklist.md` - Hotmart-specific launch sequence with affiliate recruitment

### assets/
- `kdp_cover_template.psd` - Photoshop template for KDP wraparound covers
- `gumroad_thumbnail_template.psd` - Gumroad thumbnail template
- `hotmart_sales_page_template.html` - HTML sales page template for Hotmart
- `email_swipe_templates.md` - Email copy templates for launch sequences
