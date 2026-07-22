#!/usr/bin/env python3
# ⚠️ SENTINEL PROPRIETARY — Copyright (c) 2026 AliceLabs LLC. All Rights Reserved.
#
# Detect MCP server entrypoint from package.json or pyproject.toml.
# Usage: python3 scripts/l2-detect-entrypoint.py <file> <type>
#   type: "node" or "python"
import json, os, re, sys

filepath = sys.argv[1] if len(sys.argv) > 1 else ''
filetype = sys.argv[2] if len(sys.argv) > 2 else 'node'

try:
    with open(filepath) as f:
        content = f.read()
except:
    print('node index.js' if filetype == 'node' else 'python main.py')
    sys.exit(0)

if filetype == 'node':
    try:
        pkg = json.loads(content)
    except:
        print('node index.js')
        sys.exit(0)
    scripts = pkg.get('scripts', {}) or {}
    if 'start' in scripts:
        print('sh -c "' + scripts['start'] + '"')
    else:
        bin_ = pkg.get('bin', {})
        if isinstance(bin_, dict) and bin_:
            print('node ' + list(bin_.values())[0])
        elif isinstance(bin_, str):
            print('node ' + bin_)
        else:
            main = pkg.get('main')
            if main:
                print('node ' + main)
            elif os.path.exists('dist/index.js'):
                print('node dist/index.js')
            else:
                print('node index.js')
else:
    m = re.search(r'\[project\.scripts\]\s*\n([^\[]+)', content)
    if m:
        section = m.group(1)
        line_m = re.search(r'^\s*\w+\s*=\s*[\'"]([^\'"]+)[\'"]', section, re.MULTILINE)
        if line_m:
            target = line_m.group(1)
            if ':' in target:
                mod, func = target.split(':', 1)
                print('python -c "import ' + mod + '; ' + mod + '.' + func + '()"')
            else:
                print('python -c "import ' + target + '; ' + target + '()"')
        else:
            print('python main.py')
    else:
        for c in ['main.py', 'app.py', 'server.py', 'src/main.py']:
            if os.path.exists(c):
                print('python ' + c)
                sys.exit(0)
        print('python main.py')
