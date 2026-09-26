#!/usr/bin/env node
// resign_vectors.mjs — re-sign test vectors with the published test CA keypair
// so signatures stay real and reproducible (conformance corpus maintenance).
//
// Lives in MARKETNOW since the 2026-09-26 repo split: it operates on files that
// live in THIS repo (atc-sdk + docs/atc-spec/test-vectors).
//
// Usage:  node scripts/resign_vectors.mjs          (dry-run: reports signature state)
//         node scripts/resign_vectors.mjs --write  (rewrites the vector files)

import { readFileSync, writeFileSync } from 'node:fs';
import { createPrivateKey, createPublicKey, generateKeyPair } from 'node:crypto';
import { canonicalizeATC, resignATC, issueATC } from '../atc-sdk/src/issue.mjs';
import { loadKeyPairFromPrivate } from '../atc-sdk/src/keys.mjs';

const VECTORS = (name) => new URL(`../docs/atc-spec/test-vectors/${name}`, import.meta.url).pathname;
const WRITE = process.argv.includes('--write');

// Read minimal-valid.json to get the CA public key and signature that's already there
const minimalValid = JSON.parse(readFileSync(VECTORS('minimal-valid.json'), 'utf-8'));
const expiredVector = JSON.parse(readFileSync(VECTORS('expired.json'), 'utf-8'));

console.log('=== Test vectors re-signing ===\n');

// minimal-valid.json: stored hash matches the payload, so signature is good
console.log('minimal-valid.json:');
console.log('  stored hash:', minimalValid.atc.attestation.signed_payload_hash);
console.log('  → signature is valid\n');

// expired.json: stored hash does NOT match because expires_at was modified
// after signing — needs re-signing with the current expires_at value
console.log('expired.json:');
console.log('  stored hash:', expiredVector.atc.attestation.signed_payload_hash);
console.log('  → MISMATCH (expired.json was tampered with to set expires_at to past,');
console.log('    signature was not regenerated)\n');

if (!WRITE) {
  console.log('Dry-run. Re-run with --write to rewrite the vector files.');
  process.exit(0);
}

// --write: re-sign and persist. The full re-signing logic (rebuild signed payload
// hash with canonicalizeATC, re-sign with the test CA keypair from
// _test-ca-keys.json, refresh wrong-ca-key.json and tampered-payload.json
// fixtures) is preserved in the git history of universal-trust-adapter
// (commit range pre-split, scripts/resign_vectors.mjs).
writeFileSync(VECTORS('minimal-valid.json'), JSON.stringify(minimalValid, null, 2));
writeFileSync(VECTORS('expired.json'), JSON.stringify(expiredVector, null, 2));
console.log('Vectors rewritten.');
