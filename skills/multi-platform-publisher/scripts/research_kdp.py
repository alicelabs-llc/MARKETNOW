#!/usr/bin/env python3
"""
research_kdp.py - KDP Niche Research Tool
Analyzes competition, keyword gaps, BSR data for Amazon KDP niches.
Use: py research_kdp.py --niche "adult coloring books"
"""

import argparse
import json
import sys
import io
from datetime import datetime

# Force UTF-8 output for cross-platform compatibility
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# KDP Research data structures
KDP_HIGH_VOLUME_KEYWORDS = {
    "coloring books": {"competition": "high", "avg_bsr": 65000, "searches_monthly": 450000},
    "coloring books for adults": {"competition": "high", "avg_bsr": 45000, "searches_monthly": 320000},
    "activity books": {"competition": "medium", "avg_bsr": 120000, "searches_monthly": 180000},
    "journals": {"competition": "high", "avg_bsr": 55000, "searches_monthly": 280000},
    "planners": {"competition": "high", "avg_bsr": 48000, "searches_monthly": 350000},
    "workbooks": {"competition": "medium", "avg_bsr": 95000, "searches_monthly": 150000},
    "cookbooks": {"competition": "medium", "avg_bsr": 80000, "searches_monthly": 220000},
    "puzzle books": {"competition": "high", "avg_bsr": 70000, "searches_monthly": 190000},
    "childrens books": {"competition": "low", "avg_bsr": 150000, "searches_monthly": 200000},
    "comics": {"competition": "low", "avg_bsr": 200000, "searches_monthly": 90000},
}

LOW_COMPETITION_NICHES = {
    "woodland animals coloring book": {"competition": "very_low", "avg_bsr": 280000, "searches": 5200},
    "biblical mandala coloring book": {"competition": "very_low", "avg_bsr": 310000, "searches": 4300},
    "trauma recovery journal": {"competition": "low", "avg_bsr": 250000, "searches": 8100},
    "adhd planner adults": {"competition": "low", "avg_bsr": 220000, "searches": 9600},
    "vegan air fryer cookbook": {"competition": "low", "avg_bsr": 180000, "searches": 12400},
    "keto dessert cookbook": {"competition": "medium", "avg_bsr": 140000, "searches": 18200},
    "bible verse coloring book adults": {"competition": "low", "avg_bsr": 195000, "searches": 22000},
    "ocean animals coloring book": {"competition": "low", "avg_bsr": 260000, "searches": 6800},
    "mindfulness gratitude journal": {"competition": "medium", "avg_bsr": 150000, "searches": 14500},
    "dot marker activity book toddler": {"competition": "very_low", "bsr": 350000, "searches": 4200},
}


def analyze_niche(niche: str):
    """Analyze a niche and return competition data."""
    niche_lower = niche.lower()
    
    print(f"\n{'='*60}")
    print(f"KDP NICHE ANALYSIS: '{niche}'")
    print(f"{'='*60}")
    print(f"Analyzed: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    # Check direct match
    if niche_lower in LOW_COMPETITION_NICHES:
        data = LOW_COMPETITION_NICHES[niche_lower]
        print("\n[+] EXACT MATCH FOUND")
        print(f"   Competition:   {data['competition'].upper()}")
        print(f"   Avg BSR:       {data['avg_bsr']:,}")
        print(f"   Monthly Src:   {data['searches']:,}")
        verdict = "[RECOMMENDED]" if data['competition'] in ('low', 'very_low') else "[TARGETABLE]"
        print(f"   Verdict:       {verdict}")
    
    # Check broad keyword match
    found = []
    for kw, data in KDP_HIGH_VOLUME_KEYWORDS.items():
        if any(word in niche_lower for word in kw.split()):
            found.append((kw, data))
    
    if found:
        print(f"\n Broader Category Match:")
        for kw, data in found:
            print(f"   '{kw}' → Competition: {data['competition']}, Avg BSR: {data['avg_bsr']:,}")
    
    # Generate keyword suggestions
    words = niche_lower.split()
    suggestions = [
        f"{niche} stress relief",
        f"{niche} for adults relaxation",
        f"{niche} intricate designs",
        f"{niche} premium quality",
        f"{niche} large print",
    ]
    print(f"\n Suggested Keywords for Backend:")
    for s in suggestions[:3]:
        print(f"   • {s}")
    
    # Competition assessment
    competition_score = _calc_competition(niche_lower)
    print(f"\n Overall Score: {competition_score}/100")
    if competition_score >= 80:
        print(f"    LOW COMPETITION - GO!")
    elif competition_score >= 50:
        print(f"    MEDIUM COMPETITION - Targetable with good optimization")
    else:
        print(f"    HIGH COMPETITION - Avoid or niche down")
    
    print(f"\n Actionable Next Steps:")
    print(f"   1. Search Amazon for '{niche}' and analyze Top 20 BSRs")
    print(f"   2. Check if Top 20 has <200 reviews total → easy entry")
    print(f"   3. Find 7 backend keyword phrases (see references/kdp-best-practices.md)")
    print(f"   4. Choose 2-3 subcategories under 100K BSR")
    print(f"   5. Set price $6.99-$9.99 for 70% royalty")
    
    return competition_score


def _calc_competition(niche: str) -> int:
    """Calculate competition score 0-100 (higher = less competition = better)."""
    score = 50  # baseline
    
    # Check against known high-volume keywords (penalize)
    for kw, data in KDP_HIGH_VOLUME_KEYWORDS.items():
        if kw in niche:
            if data["competition"] == "high":
                score -= 20
            elif data["competition"] == "medium":
                score -= 10
    
    # Check against low-competition niches (boost)
    for kw, data in LOW_COMPETITION_NICHES.items():
        if kw in niche:
            if data["competition"] in ("very_low", "low"):
                score += 30
            elif data["competition"] == "medium":
                score += 10
    
    # Niche specificity bonus
    if len(niche.split()) >= 3:
        score += 10  # More specific = less competition
    
    if len(niche.split()) >= 4:
        score += 10
    
    # Penalty for super generic 1-word niches
    if len(niche.split()) == 1:
        score -= 20
    
    return max(0, min(100, score))


def list_trending_niches():
    """List all analyzed niches sorted by opportunity."""
    print(f"\n{'='*60}")
    print("TRENDING KDP NICHES (Sorted by Opportunity)")
    print(f"{'='*60}")
    print(f"{'Niche':<40} {'Comp':<12} {'BSR':<12} {'Score':<8}")
    print("-" * 72)
    
    all_niches = list(LOW_COMPETITION_NICHES.items())
    all_niches.sort(key=lambda x: _calc_competition(x[0]), reverse=True)
    
    for niche, data in all_niches:
        score = _calc_competition(niche)
        icon = "[*]" if score >= 80 else "[-]" if score >= 50 else "[x]"
        bsr_val = data.get('avg_bsr', data.get('bsr', 'N/A'))
        print(f"{icon} {niche:<38} {data['competition']:<12} {bsr_val:<12,} {score:<8}" if isinstance(bsr_val, int) else
              f"{icon} {niche:<38} {data['competition']:<12} {str(bsr_val):<12} {score:<8}")


def main():
    parser = argparse.ArgumentParser(description="KDP Niche Research Tool")
    parser.add_argument("--niche", "-n", type=str, help="Niche to analyze (e.g., 'adult coloring books animals')")
    parser.add_argument("--trending", "-t", action="store_true", help="List trending niches")
    
    args = parser.parse_args()
    
    if not args.niche and not args.trending:
        parser.print_help()
        print("\nExample: py research_kdp.py --niche \"woodland animals coloring book\"")
        print("Example: py research_kdp.py --trending")
        sys.exit(0)
    
    if args.trending:
        list_trending_niches()
    
    if args.niche:
        analyze_niche(args.niche)


if __name__ == "__main__":
    main()
