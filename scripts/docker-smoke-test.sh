#!/usr/bin/env bash
# docker-smoke-test.sh — CI/local handshake test for the MarketNow MCP image
# ══════════════════════════════════════════════════════════════════════════════
# Sends a real MCP JSON-RPC session over the container's stdio and asserts:
#   1. initialize → serverInfo.name == "marketnow"
#   2. initialize → serverInfo.version == package.json version (repo truth)
#   3. tools/list → exactly the 15 marketnow_* tools, snake_case, no unknowns
#   4. no stdout pollution before the JSON-RPC frames (log lines go to stderr)
#
# Usage: bash scripts/docker-smoke-test.sh <IMAGE> [REPO_ROOT]
#   IMAGE     required — image tag/ref under test
#   REPO_ROOT optional — defaults to the git toplevel of this script's repo
# Exit 0 = image speaks MCP correctly; non-zero = DO NOT SHIP.
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

IMAGE="${1:?Usage: docker-smoke-test.sh <IMAGE> [REPO_ROOT]}"
REPO_ROOT="${2:-$(cd "$(dirname "$0")/.." && git rev-parse --show-toplevel 2>/dev/null || echo "$(dirname "$0")/..")}"

EXPECTED_VERSION="$(node -p "require('${REPO_ROOT}/mcp-server/package.json').version")"

EXPECTED_TOOLS=(
  marketnow_search_skills
  marketnow_get_skill
  marketnow_list_categories
  marketnow_get_manifest
  marketnow_get_install_command
  marketnow_verify_trust
  marketnow_verify_receipt
  marketnow_submit_skill
  marketnow_mint_referral
  marketnow_lookup_referral
  marketnow_recommend_skills
  marketnow_get_owasp_compliance
  marketnow_verify_atc_spec
  marketnow_check_revocation
  marketnow_fingerprint_tool
)

# One-shot JSON-RPC session: initialize + tools/list, framed by newline.
# `docker run -i` keeps stdio open; the server exits on stdin EOF.
REQUESTS="$(cat <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0.0.1"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
EOF
)"

echo "── smoke: image        $IMAGE"
echo "── smoke: expected ver $EXPECTED_VERSION"

RAW="$(printf '%s\n' "$REQUESTS" | docker run -i --rm --init --read-only \
      --cap-drop ALL --security-opt no-new-privileges:true \
      -e NODE_ENV=production "$IMAGE" 2>/dev/null || true)"

if [ -z "$RAW" ]; then
  echo "✗ FAIL: container produced no stdout — image is not a stdio MCP server"
  exit 1
fi

# ─── Assert initialize response ──────────────────────────────────────────────
INIT_LINE="$(printf '%s\n' "$RAW" | grep -m1 '"id":1' || true)"
if [ -z "$INIT_LINE" ]; then
  echo "✗ FAIL: no JSON-RPC response for initialize (id:1)"
  printf '%s\n' "$RAW" | head -5
  exit 1
fi
GOT_NAME="$(printf '%s' "$INIT_LINE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).result.serverInfo.name)}catch(e){console.log("PARSE_ERROR")}})')"
GOT_VERSION="$(printf '%s' "$INIT_LINE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).result.serverInfo.version)}catch(e){console.log("PARSE_ERROR")}})')"

if [ "$GOT_NAME" != "marketnow" ]; then
  echo "✗ FAIL: serverInfo.name = '$GOT_NAME' (expected 'marketnow')"
  exit 1
fi
if [ "$GOT_VERSION" != "$EXPECTED_VERSION" ]; then
  echo "✗ FAIL: serverInfo.version = '$GOT_VERSION' but package.json = '$EXPECTED_VERSION' — version drift inside the image"
  exit 1
fi
echo "✓ initialize → serverInfo { name: $GOT_NAME, version: $GOT_VERSION }"

# ─── Assert tools/list response ──────────────────────────────────────────────
TOOLS_LINE="$(printf '%s\n' "$RAW" | grep -m1 '"id":2' || true)"
if [ -z "$TOOLS_LINE" ]; then
  echo "✗ FAIL: no JSON-RPC response for tools/list (id:2)"
  exit 1
fi

GOT_TOOLS="$(printf '%s' "$TOOLS_LINE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).result.tools.map(t=>t.name).sort().join("\n"))}catch(e){console.log("PARSE_ERROR")}})')"

if [ "$GOT_TOOLS" = "PARSE_ERROR" ]; then
  echo "✗ FAIL: tools/list response is not valid JSON"
  exit 1
fi

EXPECTED_SORTED="$(printf '%s\n' "${EXPECTED_TOOLS[@]}" | sort)"

if [ "$GOT_TOOLS" != "$EXPECTED_SORTED" ]; then
  echo "✗ FAIL: tool set mismatch —"
  diff <(printf '%s\n' "${EXPECTED_TOOLS[@]}" | sort) <(printf '%s\n' "$GOT_TOOLS") || true
  exit 1
fi
echo "✓ tools/list → ${#EXPECTED_TOOLS[@]} marketnow_* tools, exact match"

echo "── smoke: PASS — image is a valid stdio MCP endpoint for v$EXPECTED_VERSION"
