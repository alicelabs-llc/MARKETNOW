#!/usr/bin/env python3
# ⚠️ SENTINEL PROPRIETARY — Copyright (c) 2026 AliceLabs LLC. All Rights Reserved.
#
# MarketNow — L2 Behavioral Analysis (v2.0 — ACTIVE testing)
# ============================================================
#
# This script analyzes results from:
#   1. Docker container stdout (passive — grep patterns)
#   2. strace output (syscall monitoring — file access, network, process spawn)
#   3. MCP probe results (active testing — adversarial inputs)
#   4. Filesystem diff (files created/modified outside /tmp)
#
# The combination of passive + active + syscall monitoring makes L2
# a REAL dynamic analysis tool, not just "arranca y mira logs".
#
# Usage: python3 scripts/l2-analyze.py
# Env:   SKILL_ID — required
# Input: /tmp/l2_output/stdout.log       (Docker container output)
#        /tmp/l2_output/strace.log        (strace syscall trace)
#        /tmp/l2_output/probe_results.json (MCP probe adversarial results)
#        /tmp/l2_output/fs_diff.txt        (filesystem changes diff)
# Output: /tmp/l2_output/result.json       (final L2 result)

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
strace_path = '/tmp/l2_output/strace.log'
probe_path = '/tmp/l2_output/probe_results.json'
fs_diff_path = '/tmp/l2_output/fs_diff.txt'
result_path = '/tmp/l2_output/result.json'

# ═══════════════════════════════════════════════════════════════════════════
# 1. STDOUT ANALYSIS (passive — same as before but enhanced)
# ═══════════════════════════════════════════════════════════════════════════

try:
    with open(stdout_path, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
except FileNotFoundError:
    text = ''
    raw = b''

stdout_patterns = {
    'network_attempts':    r'ECONNREFUSED|ENOTFOUND|ETIMEDOUT|\bconnect\b|\bfetch\b|\bhttp\b',
    'fs_write_attempts':   r'EROFS|read.only|permission.denied|EACCES',
    'process_spawns':      r'\bspawn\b|\bexec\b|\bfork\b|child_process',
    'credential_leakage':  r'api.key|token|secret|password|private.key|mnemonic',
    'crash_detected':      r'SIGSEGV|SIGKILL|OOM|crash|fatal',
    'dynamic_imports':     r'require\(|import.*dynamic|eval\(',
}

stdout_findings = {}
for key, pat in stdout_patterns.items():
    try:
        stdout_findings[key] = sum(1 for line in text.splitlines() if re.search(pat, line, re.IGNORECASE))
    except re.error:
        stdout_findings[key] = 0

# ═══════════════════════════════════════════════════════════════════════════
# 2. STRACE ANALYSIS (syscall monitoring — NEW)
# ═══════════════════════════════════════════════════════════════════════════

strace_findings = {
    'file_access_sensitive': 0,    # open/openat on /etc/shadow, ~/.ssh, etc.
    'file_write_outside_tmp': 0,   # write/unlink outside /tmp
    'network_connect': 0,          # connect() syscall
    'process_exec': 0,             # execve syscall
    'process_fork': 0,             # fork/clone syscall
    'permission_escalation': 0,    # chmod/chown/setuid
    'sensitive_paths_accessed': [],
}

strace_text = ''
try:
    with open(strace_path, 'r') as f:
        strace_text = f.read()
except FileNotFoundError:
    pass

# Parse strace lines for sensitive syscalls
SENSITIVE_PATHS = [
    '/etc/shadow', '/etc/passwd', '/etc/sudoers',
    '.ssh/id_rsa', '.ssh/id_ed25519', '.ssh/authorized_keys',
    '.aws/credentials', '.env', '.gnupg',
    '/root/.bash_history', '/proc/self/environ',
]

for line in strace_text.splitlines():
    # open/openat on sensitive paths
    if 'open' in line and ('"' in line):
        for path in SENSITIVE_PATHS:
            if path in line:
                strace_findings['file_access_sensitive'] += 1
                strace_findings['sensitive_paths_accessed'].append(path)
                break

    # connect() — network attempts
    if 'connect(' in line and 'AF_INET' in line:
        strace_findings['network_connect'] += 1

    # execve — process execution
    if 'execve(' in line:
        strace_findings['process_exec'] += 1

    # fork/clone — process creation
    if 'fork(' in line or 'clone(' in line:
        strace_findings['process_fork'] += 1

    # chmod/chown/setuid — privilege escalation
    if 'chmod(' in line or 'chown(' in line or 'setuid(' in line:
        strace_findings['permission_escalation'] += 1

    # unlink/write outside /tmp
    if ('unlink(' in line or 'write(' in line) and '/tmp/' not in line:
        # Check if it's a real filesystem path (not a pipe/socket)
        if '"' in line and not any(x in line for x in ['pipe', 'socket', 'dev/null', '/dev/']):
            strace_findings['file_write_outside_tmp'] += 1

# ═══════════════════════════════════════════════════════════════════════════
# 3. MCP PROBE ANALYSIS (active adversarial testing — NEW)
# ═══════════════════════════════════════════════════════════════════════════

probe_findings = {
    'tools_discovered': 0,
    'tools_tested': 0,
    'adversarial_findings': 0,
    'critical_findings': 0,
    'high_findings': 0,
    'details': [],
    'leaked_data': [],
}

probe_data = None
try:
    with open(probe_path, 'r') as f:
        probe_data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    pass

if probe_data:
    probe_findings['tools_discovered'] = probe_data.get('summary', {}).get('tools_discovered', 0)
    probe_findings['tools_tested'] = probe_data.get('summary', {}).get('tools_tested', 0)
    probe_findings['adversarial_findings'] = probe_data.get('summary', {}).get('adversarial_findings', 0)

    for test in probe_data.get('adversarial_tests', []):
        detail = {
            'tool': test.get('tool'),
            'category': test.get('category'),
            'severity': test.get('severity'),
            'result': test.get('result'),
        }
        probe_findings['details'].append(detail)

        if test.get('result') == 'POTENTIAL_LEAK':
            probe_findings['critical_findings'] += 1
            probe_findings['leaked_data'].append({
                'tool': test.get('tool'),
                'leaked_patterns': test.get('leaked_patterns', []),
            })
        elif test.get('result') == 'accepted' and test.get('severity') == 'critical':
            probe_findings['high_findings'] += 1

# ═══════════════════════════════════════════════════════════════════════════
# 4. FILESYSTEM DIFF ANALYSIS (NEW)
# ═══════════════════════════════════════════════════════════════════════════

fs_findings = {
    'files_created': 0,
    'files_modified': 0,
    'files_deleted': 0,
    'suspicious_changes': [],
}

try:
    with open(fs_diff_path, 'r') as f:
        fs_text = f.read()
    for line in fs_text.splitlines():
        if line.startswith('A '):
            fs_findings['files_created'] += 1
            # Flag suspicious paths
            if any(p in line for p in ['.ssh', '.aws', '.env', 'cron', 'bashrc', 'profile']):
                fs_findings['suspicious_changes'].append(line[:200])
        elif line.startswith('M '):
            fs_findings['files_modified'] += 1
        elif line.startswith('D '):
            fs_findings['files_deleted'] += 1
except FileNotFoundError:
    pass

# ═══════════════════════════════════════════════════════════════════════════
# 5. COMBINED SCORING (enhanced with active + strace + fs)
# ═══════════════════════════════════════════════════════════════════════════

sample = text[:500]
sample = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', sample).replace('\n', ' ').replace('\r', ' ')

# Determine execution status
execution_status = 'ran'
failure_reason = None

if len(raw) == 0:
    execution_status = 'ran_idle'
    failure_reason = 'Empty stdout — MCP server likely started and is waiting for stdin handshake.'
elif re.search(r'Cannot find module|MODULE_NOT_FOUND|Error: Cannot find', text):
    execution_status = 'failed_to_start'
    failure_reason = 'Node.js MODULE_NOT_FOUND — fallback Dockerfile entrypoint mismatch.'
elif re.search(r'Command \[.*\] exited with|sh: .*: not found|No such file or directory', text):
    execution_status = 'failed_to_start'
    failure_reason = 'Container command failed to execute.'
elif re.search(r'Traceback \(most recent call last\)|ImportError|ModuleNotFoundError', text):
    execution_status = 'failed_to_start'
    failure_reason = 'Python crashed on startup.'

# Build enhanced result
result = {
    'skill_id': skill_id,
    'timestamp': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'l2_version': '2.0',
    'sandbox_config': {
        'network': 'none',
        'filesystem': 'read-only',
        'capabilities': 'dropped ALL',
        'memory': '256m',
        'cpu': '0.5',
        'pids': '64',
        'timeout': '60s',
        'strace': 'enabled',
    },
    'execution_status': execution_status,
    'failure_reason': failure_reason,
    'analysis_layers': {
        'stdout_passive': stdout_findings,
        'strace_syscalls': strace_findings,
        'mcp_probe_active': probe_findings,
        'filesystem_diff': fs_findings,
    },
    'stdout_size_bytes': len(raw),
    'stdout_sample': sample,
    'l2_score': 0,
    'l2_risk_level': 'unknown',
}

# Enhanced scoring — combines all 4 analysis layers
if execution_status == 'failed_to_start':
    score = 0
    risk = 'unknown'
else:
    score = 10

    # STDOUT penalties (passive)
    if stdout_findings['network_attempts']    > 0: score -= 3
    if stdout_findings['fs_write_attempts']   > 0: score -= 2
    if stdout_findings['credential_leakage']  > 0: score -= 5
    if stdout_findings['crash_detected']      > 0: score -= 2

    # STRACE penalties (syscall-level — NEW)
    if strace_findings['file_access_sensitive'] > 0: score -= 5  # Critical: accessed /etc/shadow, .ssh, etc.
    if strace_findings['network_connect'] > 0: score -= 3       # High: tried network connect
    if strace_findings['process_exec'] > 0: score -= 3          # High: spawned processes
    if strace_findings['permission_escalation'] > 0: score -= 4 # High: tried chmod/setuid
    if strace_findings['file_write_outside_tmp'] > 0: score -= 2  # Medium: wrote outside /tmp

    # MCP PROBE penalties (active adversarial — NEW)
    if probe_findings['critical_findings'] > 0: score -= 5      # Critical: leaked data in response
    if probe_findings['high_findings'] > 0: score -= 3          # High: accepted critical adversarial input

    # FILESYSTEM penalties (NEW)
    if len(fs_findings['suspicious_changes']) > 0: score -= 4   # High: modified .ssh/.env/cron

    score = max(0, score)

    if   score < 2: risk = 'critical'
    elif score < 4: risk = 'high'
    elif score < 7: risk = 'medium'
    else:           risk = 'low'

result['l2_score'] = score
result['l2_risk_level'] = risk

# Add summary of findings
result['findings_summary'] = {
    'total_critical': (
        (1 if stdout_findings['credential_leakage'] > 0 else 0) +
        (1 if strace_findings['file_access_sensitive'] > 0 else 0) +
        probe_findings['critical_findings'] +
        (1 if len(fs_findings['suspicious_changes']) > 0 else 0)
    ),
    'total_high': (
        (1 if stdout_findings['network_attempts'] > 0 else 0) +
        (1 if strace_findings['network_connect'] > 0 else 0) +
        (1 if strace_findings['process_exec'] > 0 else 0) +
        (1 if strace_findings['permission_escalation'] > 0 else 0) +
        probe_findings['high_findings']
    ),
    'sensitive_paths_accessed': strace_findings['sensitive_paths_accessed'],
    'leaked_data': probe_findings['leaked_data'],
    'suspicious_fs_changes': fs_findings['suspicious_changes'],
}

with open(result_path, 'w') as f:
    json.dump(result, f, indent=2)

print('=== L2 RESULT (v2.0 — ACTIVE) ===')
print(json.dumps(result, indent=2))
print(f'=== stdout sample ===')
print(sample)
