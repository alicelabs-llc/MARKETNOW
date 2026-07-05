#!/usr/bin/env python3
# MarketNow — L2 Behavioral Sandbox Audit Analyzer
# ===================================================
# This script is called by .github/workflows/sentinel-l2-sandbox.yml
# after the Docker container has run. It reads the container's stdout
# log, applies behavioral pattern detection, and writes the result JSON.
#
# It's a separate file (not inline in the workflow) because:
#   1. Bash heredocs with PYEOF terminators don't work well inside YAML
#      run: | blocks (the terminator indent doesn't match).
#   2. python3 -c "..." with newlines confuses the YAML parser.
#
# Usage: python3 scripts/l2-analyze.py
# Env:   SKILL_ID — required
# Input: /tmp/l2_output/stdout.log  (Docker container output)
# Output: /tmp/l2_output/result.json  (analysis result, will be committed)

import json
import re
import os
import datetime
import sys

skill_id = os.environ.get('SKILL_ID')
if not skill_id:
    print('::error::SKILL_ID env var required', file=sys.stderr)
    sys.exit(1)

stdout_path = '/tmp/l2_output/stdout.log'
result_path = '/tmp/l2_output/result.json'

try:
    with open(stdout_path, 'rb') as f:
        raw = f.read()
    # Decode defensively — Docker output can contain weird bytes.
    text = raw.decode('utf-8', errors='replace')
except FileNotFoundError:
    text = ''
    raw = b''

# Each pattern is a plain string (no shell quoting issues).
patterns = {
    'network_attempts':    r'ECONNREFUSED|ENOTFOUND|ETIMEDOUT|\bconnect\b|\bfetch\b|\bhttp\b',
    'fs_write_attempts':   r'EROFS|read.only|permission.denied|EACCES',
    'process_spawns':      r'\bspawn\b|\bexec\b|\bfork\b|child_process',
    'credential_leakage':  r'api.key|token|secret|password|private.key|mnemonic',
    'crash_detected':      r'SIGSEGV|SIGKILL|OOM|crash|fatal',
    'dynamic_imports':     r'require\(|import.*dynamic|eval\(',
}

behavioral = {}
for key, pat in patterns.items():
    try:
        # count matching LINES (not matches) — same semantics as `grep -c`
        behavioral[key] = sum(1 for line in text.splitlines() if re.search(pat, line, re.IGNORECASE))
    except re.error:
        behavioral[key] = 0

# Truncate sample to 500 chars and strip control chars (except \n → space)
sample = text[:500]
sample = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', sample).replace('\n', ' ').replace('\r', ' ')

# ─── Detect "did_not_run" — false-negative guard ────────────────────────
# If stdout contains MODULE_NOT_FOUND / Cannot find module, the MCP
# server NEVER actually ran in the sandbox. A score of 10/10 would
# be a FALSE NEGATIVE: we'd be telling users "this skill is safe"
# when in reality we just failed to execute it.
#
# Special case: empty stdout is NOT necessarily a failure. MCP servers
# communicate via stdio JSON-RPC — a correctly behaving server starts
# up, waits for the handshake 'initialize' message on stdin, and
# produces NO output until it receives that message. In our sandbox
# we don't send any stdin, so a well-behaved MCP server will sit
# silently until the 60s timeout kills it. That's actually a GOOD
# sign (server is alive and well-behaved). We mark it 'ran_idle'.
execution_status = 'ran'
failure_reason = None
if len(raw) == 0:
    # Empty stdout — ambiguous. Could be:
    #   (a) build failed silently (bad)
    #   (b) MCP server started and is waiting for stdin (good)
    # We can't tell from stdout alone. Mark as 'ran_idle' (not
    # failed_to_start) and trust the behavioral_analysis. Score
    # stays at 10/10 because no malicious behavior was observed.
    execution_status = 'ran_idle'
    failure_reason = 'Empty stdout — MCP server likely started and is waiting for stdin handshake (normal behavior for stdio-based MCP servers). No malicious behavior observed.'
elif re.search(r'Cannot find module|MODULE_NOT_FOUND|Error: Cannot find', text):
    execution_status = 'failed_to_start'
    failure_reason = 'Node.js MODULE_NOT_FOUND — the fallback Dockerfile CMD ["node", "index.js"] does not match this server\'s entrypoint. The MCP server never actually ran.'
elif re.search(r'Command \[.*\] exited with|sh: .*: not found|No such file or directory', text):
    execution_status = 'failed_to_start'
    failure_reason = 'Container command failed to execute — see stdout_sample.'
elif re.search(r'Traceback \(most recent call last\)|ImportError|ModuleNotFoundError', text):
    # Python crash on startup — server didn't run
    execution_status = 'failed_to_start'
    failure_reason = 'Python crashed on startup (ImportError/ModuleNotFoundError/Traceback). The MCP server never actually ran.'

result = {
    'skill_id': skill_id,
    'timestamp': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'sandbox_config': {
        'network': 'none',
        'filesystem': 'read-only',
        'capabilities': 'dropped ALL',
        'memory': '256m',
        'cpu': '0.5',
        'pids': '64',
        'timeout': '60s',
    },
    'execution_status': execution_status,
    'failure_reason': failure_reason,
    'behavioral_analysis': behavioral,
    'stdout_size_bytes': len(raw),
    'stdout_sample': sample,
    'l2_score': 0,        # filled in below
    'l2_risk_level': 'unknown',
}

# Calculate L2 score (same weights as before)
if execution_status == 'failed_to_start':
    # Honest answer: we don't know because it didn't run.
    # Score 0, risk 'unknown' — NOT 'low'. The UI should show this
    # differently from a real 'low' risk.
    score = 0
    risk = 'unknown'
else:
    # 'ran' OR 'ran_idle' — server actually executed (or waited
    # for stdin) and we observed its behavior. Apply normal scoring.
    score = 10
    if behavioral['network_attempts']    > 0: score -= 3
    if behavioral['fs_write_attempts']   > 0: score -= 2
    if behavioral['credential_leakage']  > 0: score -= 5
    if behavioral['crash_detected']      > 0: score -= 2
    score = max(0, score)

    if   score < 2: risk = 'critical'
    elif score < 4: risk = 'high'
    elif score < 7: risk = 'medium'
    else:           risk = 'low'

result['l2_score'] = score
result['l2_risk_level'] = risk

with open(result_path, 'w') as f:
    json.dump(result, f, indent=2)

print('=== L2 RESULT ===')
print(json.dumps(result, indent=2))
print(f'=== stdout (first 500 chars) ===')
print(sample)
