#!/usr/bin/env node
/**
 * check-version-sync.mjs — Version consistency gate (audit follow-up 2026-09-26)
 * ================================================================================
 *
 * The public audit on 2026-09-26 flagged a version drift between
 * `mcp-server/package.json` (1.10.1), `mcp-server/README.md` (v1.11.0 badge)
 * and `mcp-server/server.json` (1.4.0). This script is the CI guard that
 * makes that class of drift impossible to merge:
 *
 *   1. mcp-server/package.json version  == mcp-server/server.json version
 *      == mcp-server/server.json packages[0].version
 *   2. mcp-server/AUDIT.md contains a changelog entry for the current version
 *   3. mcp-server/README.md badge mentions the current version
 *   4. LIVE remote endpoint (https://marketnow.site/api/mcp initialize ->
 *      serverInfo.version) is mentioned in the root README.md (remote
 *      endpoint vs npm package are two artifacts — they do not need to be
 *      equal, but the root README must state exactly what the endpoint
 *      reports. The site itself lives in eddyflores100-lang/marketnow)
 *   5. atc-sdk/package.json version == atc-sdk README "current version"
 *      mention (best-effort; fails loud so humans fix it)
 *
 * Exit code 0 = consistent. Non-zero = drift (CI fails).
 */
import { readFileSync } from 'node:fs';

// Live endpoint probe (CI runners have network; sandboxed runs fall back to info)
async function probeEndpointVersion() {
  const ENDPOINT = 'https://marketnow.site/api/mcp';
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10000);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'version-sync-gate', version: '0.0.0' } } }),
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).slice(0, 4000);
    const m = text.match(/"version"\s*:\s*"([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null; // network unavailable — non-blocking (documented in info)
  }
}

const root = new URL('..', import.meta.url).pathname;
const fail = [];
const info = [];

function read(p) {
  return readFileSync(root + p, 'utf8');
}

// ─── 1. mcp-server triple check ─────────────────────────────────────────────
const pkg = JSON.parse(read('mcp-server/package.json'));
const serverManifest = JSON.parse(read('mcp-server/server.json'));
const npmVersion = pkg.version;

if (serverManifest.version !== npmVersion) {
  fail.push(`mcp-server/server.json version (${serverManifest.version}) != package.json (${npmVersion})`);
}
const pkgEntry = (serverManifest.packages || []).find(p => p.identifier === 'marketnow-mcp');
if (pkgEntry && pkgEntry.version !== npmVersion) {
  fail.push(`mcp-server/server.json packages[marketnow-mcp].version (${pkgEntry.version}) != package.json (${npmVersion})`);
}

// ─── 2. AUDIT.md changelog entry for current version ────────────────────────
const audit = read('mcp-server/AUDIT.md');
if (!audit.includes(`**v${npmVersion}**`)) {
  fail.push(`mcp-server/AUDIT.md has no changelog entry for v${npmVersion}`);
}

// ─── 3. README badge mentions current version ───────────────────────────────
const mcpReadme = read('mcp-server/README.md');
if (!mcpReadme.includes(npmVersion)) {
  fail.push(`mcp-server/README.md does not mention version ${npmVersion} (badge/changelog out of sync)`);
}

// ─── 4. Remote endpoint version is stated in root README ───────────────────
// The site lives in eddyflores100-lang/marketnow (repo split 2026-09-26):
// the endpoint version is probed LIVE instead of reading a local copy.
const endpointVersion = await probeEndpointVersion();
if (endpointVersion) {
  const rootReadme = read('README.md');
  if (!rootReadme.includes(endpointVersion)) {
    fail.push(`root README.md does not mention the remote endpoint version ${endpointVersion} (https://marketnow.site/api/mcp)`);
  } else {
    info.push(`remote endpoint ${endpointVersion} ↔ npm package ${npmVersion} (two artifacts, both documented)`);
  }
} else {
  info.push('remote endpoint unreachable from CI — endpoint-version check skipped (non-blocking)');
}

// ─── 5. atc-sdk version sanity ──────────────────────────────────────────────
const atcPkg = JSON.parse(read('atc-sdk/package.json'));
const atcReadme = read('atc-sdk/README.md');
if (!atcReadme.includes(atcPkg.version)) {
  // The SDK README mentions the version in the install snippet / docs
  fail.push(`atc-sdk/README.md does not mention version ${atcPkg.version} (atc-sdk/package.json)`);
}
const sdkAudit = read('mcp-server/AUDIT.md');
if (!sdkAudit.includes(`agent-trust-card@${atcPkg.version}`) && !audit.includes(`agent-trust-card@${atcPkg.version}`)) {
  // best-effort: cross-reference in mcp-server AUDIT changelog
  info.push(`note: mcp-server/AUDIT.md does not cross-reference agent-trust-card@${atcPkg.version}`);
}

// ─── 6. Integration artifacts (v1.15.0): Docker / Cline / Cursor ────────────
// These files are RELEASE artifacts — they must describe the same version
// and image as the code. Drift here ships a broken install command to users.

// 6a. index.js must NOT hardcode a semver (single source of truth: package.json)
const indexSrc = read('mcp-server/index.js');
const hardcodedSemver = indexSrc.match(/version:\s*['"]\d+\.\d+\.\d+['"]/);
if (hardcodedSemver) {
  fail.push(`mcp-server/index.js hardcodes a version (${hardcodedSemver[0]}) — read PKG_VERSION from package.json instead`);
}
if (!indexSrc.includes("PKG_VERSION")) {
  fail.push('mcp-server/index.js no longer derives PKG_VERSION from package.json — the handshake version would drift');
}

// 6b. server.json metadata must point at the REAL repository and license
const CANONICAL_REPO = 'https://github.com/alicelabs-llc/MARKETNOW';
if (serverManifest.repository?.url !== CANONICAL_REPO) {
  fail.push(`mcp-server/server.json repository.url (${serverManifest.repository?.url}) != ${CANONICAL_REPO}`);
}
const CANONICAL_NAME = 'io.github.alicelabs-llc/marketnow';
if (serverManifest.name !== CANONICAL_NAME || pkg.mcpName !== CANONICAL_NAME) {
  fail.push(`server.json name / package.json mcpName must be ${CANONICAL_NAME} (got ${serverManifest.name} / ${pkg.mcpName})`);
}
if (serverManifest.license !== pkg.license) {
  fail.push(`mcp-server/server.json license (${serverManifest.license}) != package.json license (${pkg.license})`);
}

// 6c. Docker surfaces
const dockerfile = read('mcp-server/Dockerfile');
const dockerfileVer = dockerfile.match(/ARG VERSION=(\d+\.\d+\.\d+)/);
if (!dockerfileVer || dockerfileVer[1] !== npmVersion) {
  fail.push(`mcp-server/Dockerfile ARG VERSION (${dockerfileVer?.[1]}) != package.json (${npmVersion})`);
}
const compose = read('docker-compose.yml');
const composeVer = compose.match(/VERSION:\s*"?(\d+\.\d+\.\d+)"?/);
if (!composeVer || composeVer[1] !== npmVersion) {
  fail.push(`docker-compose.yml build arg VERSION (${composeVer?.[1]}) != package.json (${npmVersion})`);
}
const registryEntry = read('docker/mcp-registry-entry.yaml');
if (!registryEntry.includes(`version: ${npmVersion}`)) {
  fail.push(`docker/mcp-registry-entry.yaml does not declare version ${npmVersion}`);
}

// 6d. .cursor/mcp.json — valid JSON; active entry pins a REAL marketnow-mcp version
//     npx entries must pin the PUBLISHED npm latest; docker entries the source version.
async function probeNpmLatest() {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10000);
    const res = await fetch('https://registry.npmjs.org/marketnow-mcp', { signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    return d?.['dist-tags']?.latest || null;
  } catch {
    return null; // registry unreachable — non-blocking
  }
}
const publishedVersion = await probeNpmLatest();
if (publishedVersion) info.push(`npm registry latest: marketnow-mcp@${publishedVersion} (repo source: ${npmVersion} — npm trails by design)`);

const cursorCfg = JSON.parse(read('.cursor/mcp.json'));
const cursorServer = cursorCfg.mcpServers?.marketnow;
if (!cursorServer) fail.push('.cursor/mcp.json has no mcpServers.marketnow entry');
if (cursorServer?.command === 'npx') {
  const pin = cursorServer.args?.find(a => /^marketnow-mcp@\d+\.\d+\.\d+$/.test(a));
  if (!pin) fail.push('.cursor/mcp.json npx entry must pin marketnow-mcp@<exact semver> (no @latest)');
  else if (publishedVersion && pin !== `marketnow-mcp@${publishedVersion}`)
    fail.push(`.cursor/mcp.json pins ${pin} but npm latest is @${publishedVersion} — repin the published release`);
} else if (cursorServer?.command === 'docker') {
  if (!cursorServer.args?.includes(`ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`))
    fail.push(`.cursor/mcp.json docker entry must pin ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`);
}

// 6e. Cline settings — valid JSON, same policy as 6d + documented alternative
const clineCfg = JSON.parse(read('integrations/cline/cline_mcp_settings.json'));
const clineServer = clineCfg.mcpServers?.marketnow;
if (!clineServer) fail.push('integrations/cline/cline_mcp_settings.json has no mcpServers.marketnow entry');
if (clineServer?.command === 'npx') {
  const pin = clineServer.args?.find(a => /^marketnow-mcp@\d+\.\d+\.\d+$/.test(a));
  if (!pin) fail.push('integrations/cline/cline_mcp_settings.json npx entry must pin marketnow-mcp@<exact semver> (no @latest)');
  else if (publishedVersion && pin !== `marketnow-mcp@${publishedVersion}`)
    fail.push(`integrations/cline/cline_mcp_settings.json pins ${pin} but npm latest is @${publishedVersion} — repin the published release`);
} else if (clineServer?.command === 'docker') {
  if (!clineServer.args?.includes(`ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`))
    fail.push(`integrations/cline/cline_mcp_settings.json docker entry must pin ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`);
}
// The documented Docker alternative (works once the GHCR package is public / with login)
const clineAlt = clineCfg._alternative_docker;
if (clineAlt && !clineAlt.args?.includes(`ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`)) {
  fail.push(`integrations/cline _alternative_docker must pin ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`);
}

// 6f. docker image tag sanity in server.json docker package entry
const dockerPkg = (serverManifest.packages || []).find(p => p.registryType === 'docker');
if (!dockerPkg || dockerPkg.identifier !== 'ghcr.io/alicelabs-llc/marketnow-mcp') {
  fail.push('mcp-server/server.json must declare the docker package ghcr.io/alicelabs-llc/marketnow-mcp');
} else if (dockerPkg.version !== npmVersion) {
  fail.push(`mcp-server/server.json docker package version (${dockerPkg.version}) != package.json (${npmVersion})`);
}

// ─── 7. Registry root server.json (official MCP registry manifest) ──────────
// The ROOT server.json is what the official MCP registry lists. It must describe
// what clients actually GET today: the PUBLISHED npm release and the live remote,
// not the repo source train (mcp-server/ = next release).
const rootManifest = JSON.parse(read('server.json'));
if (rootManifest.name !== CANONICAL_NAME) {
  fail.push(`root server.json name (${rootManifest.name}) != ${CANONICAL_NAME}`);
}
if (rootManifest.repository?.url !== CANONICAL_REPO) {
  fail.push(`root server.json repository.url (${rootManifest.repository?.url}) != ${CANONICAL_REPO}`);
}
const remoteEntry = (rootManifest.remotes || []).find(r => r.type === 'streamable-http');
if (remoteEntry?.url !== 'https://www.marketnow.site/api/mcp') {
  fail.push(`root server.json remote url (${remoteEntry?.url}) != https://www.marketnow.site/api/mcp`);
}
const rootNpmPkg = (rootManifest.packages || []).find(p => p.identifier === 'marketnow-mcp');
if (!rootNpmPkg) fail.push('root server.json must declare the npm package marketnow-mcp');
if (rootNpmPkg && rootManifest.version !== rootNpmPkg.version) {
  fail.push(`root server.json version (${rootManifest.version}) != npm package version (${rootNpmPkg.version})`);
}
if (rootNpmPkg && publishedVersion && rootNpmPkg.version !== publishedVersion) {
  fail.push(`root server.json npm package version (${rootNpmPkg.version}) != registry latest (${publishedVersion}) — the registry manifest must list the published release`);
}
const rootDockerPkg = (rootManifest.packages || []).find(p => p.registryType === 'docker');
if (rootDockerPkg && rootDockerPkg.version !== npmVersion) {
  fail.push(`root server.json docker package version (${rootDockerPkg.version}) != source version (${npmVersion}) — the image tag CI pushes is the source version`);
}

// ─── Report ─────────────────────────────────────────────────────────────────
for (const i of info) console.log(`  ℹ ${i}`);
if (fail.length > 0) {
  console.error(`\nVERSION DRIFT DETECTED (${fail.length}):`);
  for (const f of fail) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\nVersion sync OK: marketnow-mcp@${npmVersion} · server.json@${serverManifest.version} · agent-trust-card@${atcPkg.version}`);
