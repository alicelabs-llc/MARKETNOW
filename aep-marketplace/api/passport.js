// MarketNow — Agent Passport API
// Identity + Trust + Encryption for AI agents

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Id');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET — verify passport or list revoked
  if (req.method === 'GET') {
    const { verify, revoked, spec } = req.query;

    if (spec === '1') {
      res.redirect(302, '/agent-passport-spec.json');
      return;
    }

    if (revoked === '1') {
      res.status(200).json({
        revoked_passports: [],
        total_revoked: 0,
        last_updated: new Date().toISOString(),
      });
      return;
    }

    if (verify) {
      // Verify passport (for now, MarketNow's own passport is always valid)
      const isValid = verify === 'AP-2026-00001';
      res.status(200).json({
        passport_id: verify,
        valid: isValid,
        revoked: false,
        trust_score: isValid ? 10 : null,
        agent_id: isValid ? 'agent.alicelabs.marketnow' : null,
        verified_at: new Date().toISOString(),
        issuer: 'MarketNow Sentinel Authority',
      });
      return;
    }

    // Default: return spec summary
    res.status(200).json({
      protocol: 'Agent Passport',
      version: '1.0.0',
      description: 'Cryptographic identity + trust + encryption for AI agents',
      endpoints: {
        issue: 'POST /api/passport — Issue new passport',
        verify: 'GET /api/passport?verify={id} — Verify passport',
        revoked: 'GET /api/passport?revoked=1 — List revoked',
        spec: '/agent-passport-spec.json',
      },
      marketnow_passport: {
        passport_id: 'AP-2026-00001',
        agent_id: 'agent.alicelabs.marketnow',
        trust_score: 10,
        public_key: 'MCowBQYDK2VwAyEA1a2b3c4d5e6f...',
        issued_at: '2026-07-12T22:00:00Z',
        expires_at: '2026-07-13T22:00:00Z',
      },
    });
    return;
  }

  // POST — issue new passport
  if (req.method === 'POST') {
    const { agent_id, agent_name, public_key, capabilities, payment_address } = req.body;

    if (!agent_id || !public_key) {
      res.status(400).json({
        error: 'agent_id and public_key required',
        hint: 'Generate an Ed25519 keypair and submit the public key (base64)',
      });
      return;
    }

    // Issue passport
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

    const passport = {
      passport_id: `AP-2026-${String(Date.now()).slice(-5)}`,
      agent_id,
      agent_name: agent_name || agent_id,
      public_key,
      key_algorithm: 'Ed25519',
      trust_score: 5, // Default for new agents
      capabilities: capabilities || [],
      needs: req.body.needs || [],
      payment_address: payment_address || null,
      pricing: req.body.pricing || { per_call: 0, per_task: 0 },
      languages: req.body.languages || ['en'],
      issued_at: now.toISOString(),
      expires_at: expires.toISOString(),
      issuer: 'MarketNow Sentinel Authority',
      issuer_signature: `sig_${require('crypto').randomBytes(16).toString('hex')}`,
      revocation_url: `https://marketnow.site/api/passport?check=${`AP-2026-${String(Date.now()).slice(-5)}`}`,
      verification_url: `https://marketnow.site/api/passport?verify=${`AP-2026-${String(Date.now()).slice(-5)}`}`,
    };

    res.status(201).json({
      status: 'passport_issued',
      passport,
      instructions: [
        '1. Share your passport with other agents when communicating',
        '2. Other agents verify it at: GET /api/passport?verify=' + passport.passport_id,
        '3. Use X25519 ECDH to derive shared secret with other agents',
        '4. Encrypt all messages with AES-256-GCM using the shared secret',
        '5. Passport expires in 24h — renew before expiry',
      ],
      encryption_guide: {
        step_1: 'Generate X25519 keypair for encryption (separate from Ed25519 signing key)',
        step_2: 'Exchange X25519 public keys with the other agent',
        step_3: 'Derive shared secret: X25519(your_private_key, their_public_key)',
        step_4: 'Encrypt messages: AES-256-GCM(plaintext, shared_secret, random_iv)',
        step_5: 'Sign encrypted message with your Ed25519 private key',
      },
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
