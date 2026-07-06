#!/usr/bin/env python3

# ⚠️ SENTINEL PROPRIETARY — Copyright (c) 2026 AliceLabs LLC. All Rights Reserved.
#
# This file is part of the Sentinel Security Audit Engine.
# DO NOT COPY, REDISTRIBUTE, OR BUILD COMPETING PRODUCTS.
# See SENTINEL-LICENSE for full terms.
#
# "Sentinel" is a trademark of AliceLabs LLC.
# Patent pending on the 3-layer audit pipeline (L1.5 → L1.6 → L2).
#
# For licensing: legal@marketnow.site
# For verification: https://marketnow.site/verify
# MarketNow — L2 Repo URL Parser
# ================================
# Parses a GitHub URL (which may include /tree/branch/subpath) into
# OWNER_REPO, REF, SUBPATH, and CLONE_URL environment variables
# emitted as bash `export` statements on stdout.
#
# Usage: eval "$(python3 scripts/l2-parse-url.py <REPO_URL>)"
# Or:    python3 scripts/l2-parse-url.py <REPO_URL>  (prints export statements)

import os
import re
import sys

url = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('REPO_URL', '')
if not url:
    print('echo "::error::REPO_URL required"; exit 1')
    sys.exit(1)

# Strip trailing slash and .git
url = url.rstrip('/').removesuffix('.git')

m = re.match(r'^https?://github\.com/([^/]+/[^/]+)(?:/tree/([^/]+)(?:/(.+))?)?$', url)
if not m:
    print(f'echo "::error::Invalid GitHub URL: {url}"; exit 1')
    sys.exit(1)

owner_repo = m.group(1)
ref = m.group(2) or ''
subpath = m.group(3) or ''
clone_url = f'https://github.com/{owner_repo}.git'

# Emit as bash export statements (for eval)
print(f'OWNER_REPO="{owner_repo}"')
print(f'REF="{ref}"')
print(f'SUBPATH="{subpath}"')
print(f'CLONE_URL="{clone_url}"')
