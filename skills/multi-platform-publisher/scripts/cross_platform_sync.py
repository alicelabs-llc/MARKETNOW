#!/usr/bin/env python3
"""
cross_platform_sync.py - Cross-Platform Price/Description Sync Tool
Generates synchronized pricing and descriptions across all platforms.
"""

import argparse
import sys
import io
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

PRICING_TEMPLATES = {
    "ebook_kdp_70": {"min": 2.99, "max": 9.99, "royalty": 0.70, "note": "70% royalty tier"},
    "ebook_kdp_35": {"min": 0.99, "max": 2.98, "royalty": 0.35, "note": "35% royalty tier - avoid"},
    "paperback": {"commission": 0.40, "note": "Cost + 40% margin minimum"},
    "gumroad_template": {"min": 3.00, "max": 29.00, "note": "Digital templates/presets"},
    "gumroad_bundle": {"min": 19.00, "max": 49.00, "note": "Bundled products"},
    "gumroad_course": {"min": 47.00, "max": 197.00, "note": "Premium courses"},
    "hotmart_entry": {"min": 27.00, "max": 67.00, "note": "Entry level"},
    "hotmart_core": {"min": 97.00, "max": 197.00, "note": "Main product"},
    "hotmart_premium": {"min": 297.00, "max": 997.00, "note": "Coaching/mentorship"},
    "shopify_standard": {"min": 5.00, "max": 29.00, "note": "Digital downloads"},
    "shopify_subscription": {"min": 9.00, "max": 47.00, "note": "Per month with annual discount"},
}


def sync_pricing(base_price: float, product_type: str = "ebook"):
    """Generate synchronized pricing across all platforms."""
    print(f"\n{'='*60}")
    print("PRICE SYNC MATRIX")
    print(f"{'='*60}")
    print(f"Base reference: ${base_price:.2f}\n")
    
    pricing = {
        "KDP (eBook)": f"${min(max(base_price * 0.7, 2.99), 9.99):.2f}",
        "KDP (Paperback)": f"${base_price * 1.4:.2f} (est, depends on print cost)",
        "Gumroad": f"${min(max(base_price, 3.00), 197.00):.2f}",
        "Hotmart": f"${min(max(base_price * 3, 27.00), 997.00):.2f}",
        "Shopify": f"${min(max(base_price, 5.00), 49.00):.2f}",
    }
    
    for platform, price in pricing.items():
        print(f"  {platform:<25} {price}")
    
    # Earnings projection
    print(f"\n{'='*60}")
    print("EARNINGS PROJECTION (per 100 sales)")
    print(f"{'='*60}")
    earnings = {
        "KDP (eBook)": 100 * float(pricing["KDP (eBook)"].replace("$","")) * 0.70,
        "Gumroad": 100 * float(pricing["Gumroad"].replace("$","")) * 0.91,
        "Hotmart": 100 * float(pricing["Hotmart"].replace("$","")) * 0.60,
        "Shopify": 100 * float(pricing["Shopify"].replace("$","")) * 0.98,
    }
    for platform, amount in earnings.items():
        print(f"  {platform:<25} ${amount:.2f}")


def sync_descriptions(title: str, bullets: list, niches: list = None):
    """Generate platform-adapted descriptions from core bullets."""
    print(f"\n{'='*60}")
    print(f"DESCRIPTION SYNC FOR: {title}")
    print(f"{'='*60}")
    
    # KDP description (formal, keyword-rich)
    kdp_desc = f"Are you looking for {niches[0] if niches else 'a solution'}?\n\n"
    kdp_desc += f"Inside {title}, you'll discover:\n"
    for b in bullets:
        kdp_desc += f"* {b}\n"
    kdp_desc += "\nScroll up and click 'Buy Now'."
    
    print(f"\n-- KDP Description --\n{kdp_desc}\n")
    
    # Gumroad description (benefit-driven, casual)
    gumroad_desc = f"# {title}\n\n## What You Get\n"
    for i, b in enumerate(bullets, 1):
        gumroad_desc += f"{i}. {b}\n"
    gumroad_desc += "\n## Instant Download\nGet access immediately after purchase."
    
    print(f"-- Gumroad Description --\n{gumroad_desc}\n")
    
    # Hotmart description (transformation-focused)
    hotmart_desc = f"## Who Is This For?\n- Target audience for {title}\n\n"
    hotmart_desc += "## What Will You Achieve?\n"
    for b in bullets:
        hotmart_desc += f"* {b}\n"
    hotmart_desc += "\n## 7-Day Money Back Guarantee"
    
    print(f"-- Hotmart Description --\n{hotmart_desc}")


def main():
    parser = argparse.ArgumentParser(description="Cross-Platform Sync Tool")
    parser.add_argument("--pricing", "-p", type=float, help="Base price to sync")
    parser.add_argument("--desc", "-d", nargs="+", help="Description bullets for sync")
    parser.add_argument("--title", "-t", help="Product title")
    parser.add_argument("--niches", nargs="+", help="Target niches/keywords")
    
    args = parser.parse_args()
    
    if args.pricing:
        sync_pricing(args.pricing)
    
    if args.desc and args.title:
        sync_descriptions(args.title, args.desc, args.niches)
    
    if not args.pricing and not args.desc:
        parser.print_help()
        print("\nExamples:")
        print("  py cross_platform_sync.py --pricing 9.97")
        print('  py cross_platform_sync.py --desc "Feature 1" "Feature 2" --title "My Product" --niches "keyword 1" "keyword 2"')

if __name__ == "__main__":
    main()
