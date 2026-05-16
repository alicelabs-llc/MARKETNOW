#!/usr/bin/env python3
"""
generate_listing.py - Multi-Platform Listing Generator
Generates optimized product listings for KDP, Gumroad, Hotmart, and Shopify.
"""

import argparse
import sys
import textwrap
import io
from datetime import datetime

# Force UTF-8 output for cross-platform compatibility
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


PLATFORM_SPECS = {
    "kdp": {
        "name": "Amazon KDP",
        "title_max": 200,
        "desc_max": 4000,
        "keywords_max": 7,
        "keywords_chars": 249,
    },
    "gumroad": {
        "name": "Gumroad",
        "title_max": 80,
        "desc_max": 5000,
        "tags_max": 5,
    },
    "hotmart": {
        "name": "Hotmart",
        "title_max": 80,
        "desc_max": 10000,
    },
    "shopify": {
        "name": "Shopify",
        "title_max": 60,
        "desc_max": 5000,
        "meta_desc_max": 160,
    },
}


def generate_kdp_listing(niche: str, title: str, subtitle: str = "", keywords: list = None):
    """Generate an optimized KDP listing."""
    print(f"{'='*60}")
    print("📚 AMAZON KDP LISTING")
    print(f"{'='*60}")
    
    # Validate title length
    full_title = f"{title}: {subtitle}" if subtitle else title
    if len(full_title) > PLATFORM_SPECS["kdp"]["title_max"]:
        print(f"⚠️  Title is {len(full_title)} chars (max {PLATFORM_SPECS['kdp']['title_max']})")
        full_title = full_title[:PLATFORM_SPECS["kdp"]["title_max"]]
    
    print(f"\n📌 TITLE ({len(full_title)} chars):")
    print(f"   {full_title}")
    print(f"   {'-' * 40}")
    print(f"   Formula: [Primary Keyword] - [Benefit] [Secondary Keyword]")
    print(f"   Tip: Put main keyword at the START of the title")
    
    # Book subtitle
    if subtitle:
        print(f"\n📌 SUBTITLE:")
        print(f"   {subtitle}")
    
    # Description (KDP A+ style with emojis)
    print(f"\n📌 DESCRIPTION (scroll up format):")
    desc = (
        f"🎯 Are you tired of [PROBLEM]? Do you wish you could [DESIRED OUTCOME]?\n\n"
        f"Inside {title}, you'll discover:\n"
        f"✅ [Feature 1] - [Benefit]\n"
        f"✅ [Feature 2] - [Benefit]\n"
        f"✅ [Feature 3] - [Benefit]\n"
        f"✅ [Feature 4] - [Benefit]\n"
        f"✅ [Feature 5] - [Benefit]\n\n"
        f"📖 What's inside:\n"
        f"• [Page count] pages of premium content\n"
        f"• [Format details]\n"
        f"• Large 8.5\" x 11\" trim size\n\n"
        f"📏 Product Details:\n"
        f"• Format: Paperback\n"
        f"• Pages: [X]\n"
        f"• Dimensions: 8.5\" x 11\"\n"
        f"• Language: English\n\n"
        f"📈 Scroll up and click \"Buy Now\" to start your [TRANSFORMATION]!\n"
    )
    print(desc)
    
    # Backend keywords
    print(f"\n📌 BACKEND KEYWORDS (7 fields, {PLATFORM_SPECS['kdp']['keywords_chars']} chars each):")
    if keywords:
        for i, kw in enumerate(keywords[:7], 1):
            print(f"   {i}. {kw} ({len(kw)} chars)")
    else:
        print(f"   Keywords needed. Run with --keywords or generate manually.")
        print(f"   Example keywords for '{niche}':")
        kw_examples = [
            f"{niche} stress relief relaxation",
            f"{niche} for adults anxiety",
            f"{niche} intricate designs patterns",
            f"{niche} gift women men teens",
            f"{niche} large print easy coloring",
        ]
        for i, ex in enumerate(kw_examples, 1):
            print(f"   {i}. {ex} ({len(ex)} chars)")
    
    # Categories
    print(f"\n📌 RECOMMENDED CATEGORIES:")
    print(f"   1. [Primary Category] (BSR under 100K)")
    print(f"   2. [Secondary Category] (niche-specific)")
    print(f"   3. [Tertiary Category] (via KDP Support request)")
    
    # Pricing
    print(f"\n📌 PRICING RECOMMENDATION:")
    print(f"   eBook: $6.99 - $9.99 (70% royalty tier)")
    print(f"   Paperback: Cost + 40% margin")
    print(f"   KDP Select: Enable KU for page reads revenue")


def generate_gumroad_listing(title: str, price: float, tags: list = None):
    """Generate an optimized Gumroad listing."""
    print(f"\n{'='*60}")
    print("🛒 GUMROAD LISTING")
    print(f"{'='*60}")
    
    if len(title) > PLATFORM_SPECS["gumroad"]["title_max"]:
        print(f"⚠️  Title is {len(title)} chars (max {PLATFORM_SPECS['gumroad']['title_max']})")
    
    print(f"\n📌 PRODUCT NAME:")
    print(f"   {title}")
    
    print(f"\n📌 PRICE: ${price:.2f}")
    
    print(f"\n📌 DESCRIPTION TEMPLATE:")
    desc = f"""# {title}

## What You Get
- Product asset 1 with X items
- Product asset 2 in multiple formats
- BONUS: Free bonus item (value $XX)

## Who Is This For?
- Persona 1: who needs X
- Persona 2: who wants Y

## What You'll Need
- Software/account requirements (if any)

## Refund Policy
100% satisfaction guarantee. 30-day money-back if you're not happy.
"""
    print(desc)
    
    # Tags
    print(f"\n📌 TAGS (max {PLATFORM_SPECS['gumroad']['tags_max']}):")
    if tags:
        for t in tags[:5]:
            print(f"   • {t}")
    else:
        print("   Mix 3 broad + 2 specific tags for discovery")
    
    # Email sequence
    print(f"\n📌 AUTOMATED EMAIL SEQUENCE:")
    print(f"   Email 1 (Auto): Delivery + upsell at 50% off")
    print(f"   Email 2 (Day 3): Use cases/tips + request review/share")
    print(f"   Email 3 (Day 7): Related product + affiliate program")
    
    # Pricing psychology
    print(f"\n📌 PRICING PSYCHOLOGY:")
    print(f"   $9-$19 → Templates, presets, AI prompts")
    print(f"   $19-$49 → Bundles, UI kits, courses")
    print(f"   $49-$197 → Premium courses, coaching")
    print(f"   Tip: Use structured pricing ($9.97, $19.47)")


def generate_hotmart_listing(title: str, price: float):
    """Generate an optimized Hotmart listing."""
    print(f"\n{'='*60}")
    print("🎓 HOTMART INFO PRODUCT LISTING")
    print(f"{'='*60}")
    
    if len(title) > PLATFORM_SPECS["hotmart"]["title_max"]:
        print(f"⚠️  Title is {len(title)} chars (max {PLATFORM_SPECS['hotmart']['title_max']})")
    
    print(f"\n📌 TITLE:")
    print(f"   {title}")
    
    print(f"\n📌 PRICE: ${price:.2f}")
    
    print(f"\n📌 COMMISSION: 50-60% (to attract affiliates)")
    
    print(f"\n📌 SALES PAGE STRUCTURE:")
    print(f"")
    sales_page = """
🎯 HEADLINE (3 lines max)
[Problem statement]
[Solution statement]
[Transformation promise]

💔 THE PROBLEM (2-3 paragraphs)
- Aggravate the pain
- Show the cost of inaction
- Reader must feel "this is me"

✅ THE SOLUTION
- Present your product as the answer
- Features → Benefits
- "What you'll learn" bullet list

📚 MODULE BREAKDOWN
Module 1: [Name] - What they'll achieve
Module 2: [Name] - What they'll achieve
...
Module X: [Name] - BONUS included

⭐ SOCIAL PROOF
"Since taking this course, I've..."
- Real testimonials with photos
- Before/after stats
- Number of students

🎁 BONUSES (Conversion Driver)
Bonus 1: [Name] (Value: $XX)
Bonus 2: [Name] (Value: $XX)
Bonus 3: [Name] (Value: $XX)
Total Value: $XXX — Your Price: $XX

🛡️ GUARANTEE
100% Satisfaction - 7 Day Money Back
No questions asked. If you're not satisfied, get a full refund.

👇 [CLICK HERE TO ENROLL NOW]
"""
    print(sales_page)


def generate_shopify_listing(title: str, price: float, meta_desc: str = ""):
    """Generate an optimized Shopify listing."""
    print(f"\n{'='*60}")
    print("🏪 SHOPIFY DIGITAL PRODUCT LISTING")
    print(f"{'='*60}")
    
    if len(title) > PLATFORM_SPECS["shopify"]["title_max"]:
        print(f"⚠️  Title is {len(title)} chars (max {PLATFORM_SPECS['shopify']['title_max']})")
    
    print(f"\n📌 PRODUCT TITLE:")
    print(f"   {title}")
    
    print(f"\n📌 PRICE: ${price:.2f}")
    
    print(f"\n📌 META DESCRIPTION ({len(meta_desc) or 0} chars):")
    if meta_desc:
        print(f"   {meta_desc}")
    else:
        md = f"Transform your workflow with {title}. Instant digital download. Perfect for [audience]. Satisfaction guaranteed."
        print(f"   {md[:PLATFORM_SPECS['shopify']['meta_desc_max']]}")
    
    print(f"\n📌 PRODUCT DESCRIPTION:")
    prod_desc = f"""
About this product:
{title} is your all-in-one solution for [use case].

What's Included:
✔️ [File 1] - ready to use
✔️ [File 2] - compatible with [software]
✔️ [Bonus] - free with purchase

Product Details:
• Format: [format type]
• Compatibility: [software/OS]
• File size: [X MB]
• License: Personal/Commercial use

Delivery:
• Instant download after purchase
• Unlimited access forever
• No subscription needed

100% Satisfaction Guarantee
If you're not happy with your purchase, contact us within 30 days for a full refund.
"""
    print(prod_desc)
    
    print(f"\n📌 SEO RECOMMENDATIONS:")
    print(f"   • Collection: Create category-specific collections")
    print(f"   • Image Alt Text: Descriptive, keyword-rich")
    print(f"   • URL Handle: {title.lower().replace(' ', '-')[:50]}")
    print(f"   • Structured Data: Enable schema markup for digital products")
    
    # Pricing strategies
    print(f"\n📌 SHOPIFY PRICING STRATEGIES:")
    print(f"   • Standard: ${price:.2f}")
    print(f"   • Bundle (3 products): ${price * 2.5:.2f} (save {((3 * price - price * 2.5) / (3 * price) * 100):.0f}%)")
    print(f"   • Subscription: ${(price / 3):.2f}/month or ${(price * 0.8):.2f}/year")


def main():
    parser = argparse.ArgumentParser(description="Multi-Platform Listing Generator")
    parser.add_argument("--platform", "-p", required=True, 
                        choices=["kdp", "gumroad", "hotmart", "shopify", "all"],
                        help="Target platform")
    parser.add_argument("--title", "-t", required=True, help="Product title")
    parser.add_argument("--niche", "-n", help="Niche/keyword for optimization")
    parser.add_argument("--subtitle", "-s", help="Subtitle (KDP only)")
    parser.add_argument("--price", type=float, default=9.97, help="Product price")
    parser.add_argument("--keywords", "-k", nargs="+", help="Backend keywords (KDP)")
    parser.add_argument("--tags", help="Tags/comma-separated (Gumroad)")
    
    args = parser.parse_args()
    
    print(f"\n📢 GENERATING LISTINGS FOR: '{args.title}'")
    print(f"   Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    keywords_list = args.keywords or []
    tags_list = [t.strip() for t in args.tags.split(",")] if args.tags else []
    
    if args.platform == "all":
        generate_kdp_listing(args.niche or args.title, args.title, args.subtitle, keywords_list)
        generate_gumroad_listing(args.title, args.price, tags_list)
        generate_hotmart_listing(args.title, args.price)
        generate_shopify_listing(args.title, args.price)
    elif args.platform == "kdp":
        generate_kdp_listing(args.niche or args.title, args.title, args.subtitle, keywords_list)
    elif args.platform == "gumroad":
        generate_gumroad_listing(args.title, args.price, tags_list)
    elif args.platform == "hotmart":
        generate_hotmart_listing(args.title, args.price)
    elif args.platform == "shopify":
        generate_shopify_listing(args.title, args.price)
    
    print(f"\n{'='*60}")
    print("✅ DONE! Copy the listing above and paste into your platform.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
