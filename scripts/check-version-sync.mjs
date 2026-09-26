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
 *   4. aep-marketplace/api/mcp.js SERVER_INFO.version is mentioned in the
 *      root README.md (remote endpoint vs npm package are two artifacts —
 *      they do not need to be equal, but the root README must state exactly
 *      what the endpoint reports)
 *   5. atc-sdk/package.json version == atc-sdk README "current version"
 *      mention (best-effort; fails loud so humans fix it)
 *
 * Exit code 0 = consistent. Non-zero = drift (CI fails).
 */
import { readFileSync } from 'node:fs';

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
const mcpApi = read('aep-marketplace/api/mcp.js');
const endpointMatch = mcpApi.match(/version:\s*"([^"]+)"/);
if (endpointMatch) {
  const endpointVersion = endpointMatch[1];
  const rootReadme = read('README.md');
  if (!rootReadme.includes(endpointVersion)) {
    fail.push(`root README.md does not mention the remote endpoint version ${endpointVersion} (api/mcp.js)`);
  } else {
    info.push(`remote endpoint ${endpointVersion} ↔ npm package ${npmVersion} (two artifacts, both documented)`);
  }
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

// 6d. .cursor/mcp.json — valid JSON, runs the canonical image at the right tag
const cursorCfg = JSON.parse(read('.cursor/mcp.json'));
const cursorServer = cursorCfg.mcpServers?.marketnow;
if (!cursorServer) fail.push('.cursor/mcp.json has no mcpServers.marketnow entry');
if (cursorServer && !cursorServer.args?.includes(`ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`)) {
  fail.push(`.cursor/mcp.json does not pin ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`);
}

// 6e. Cline settings — valid JSON, canonical image at the right tag
const clineCfg = JSON.parse(read('integrations/cline/cline_mcp_settings.json'));
const clineServer = clineCfg.mcpServers?.marketnow;
if (!clineServer) fail.push('integrations/cline/cline_mcp_settings.json has no mcpServers.marketnow entry');
if (clineServer && !clineServer.args?.includes(`ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`)) {
  fail.push(`integrations/cline/cline_mcp_settings.json does not pin ghcr.io/alicelabs-llc/marketnow-mcp:${npmVersion}`);
}
if (clineServer?.command === 'npx' && !clineServer.args?.includes(`marketnow-mcp@${npmVersion}`)) {
  fail.push(`integrations/cline/cline_mcp_settings.json npx variant must pin marketnow-mcp@${npmVersion}`);
}

// 6f. docker image tag sanity in server.json docker package entry
const dockerPkg = (serverManifest.packages || []).find(p => p.registryType === 'docker');
if (!dockerPkg || dockerPkg.identifier !== 'ghcr.io/alicelabs-llc/marketnow-mcp') {
  fail.push('mcp-server/server.json must declare the docker package ghcr.io/alicelabs-llc/marketnow-mcp');
} else if (dockerPkg.version !== npmVersion) {
  fail.push(`mcp-server/server.json docker package version (${dockerPkg.version}) != package.json (${npmVersion})`);
}

// ─── Report ─────────────────────────────────────────────────────────────────
for (const i of info) console.log(`  ℹ ${i}`);
if (fail.length > 0) {
  console.error(`\nVERSION DRIFT DETECTED (${fail.length}):`);
  for (const f of fail) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\nVersion sync OK: marketnow-mcp@${npmVersion} · server.json@${serverManifest.version} · agent-trust-card@${atcPkg.version}`);
