/**
 * MarketNow — Verify Purchase
 * GET /api/verify-purchase?sessionId=cs_live_xxx
 * 
 * Verifies that a Stripe checkout session was completed.
 * Returns the skill ID and a generated license key.
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId parameter required' });
    }

    if (!STRIPE_KEY) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    // Fetch the session from Stripe
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${STRIPE_KEY}` },
    });

    if (!stripeRes.ok) {
      if (stripeRes.status === 404) {
        return res.status(404).json({ error: 'Session not found' });
      }
      throw new Error(`Stripe API error: ${stripeRes.status}`);
    }

    const session = await stripeRes.json();

    // Check if payment was completed
    if (session.payment_status !== 'paid') {
      return res.status(200).json({
        verified: false,
        sessionId,
        paymentStatus: session.payment_status,
        message: 'Payment not completed yet',
      });
    }

    // Extract skill info from metadata
    const metadata = session.metadata || {};
    const skillId = metadata.skill_id;
    const skillName = metadata.skill_name;

    // Generate a license key
    const licenseKey = `MN-LIC-${skillId?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'GENERIC'}-${Date.now().toString(36).toUpperCase()}`;

    return res.status(200).json({
      verified: true,
      sessionId,
      skillId,
      skillName,
      licenseKey,
      purchasedAt: new Date(session.created * 1000).toISOString(),
      amount: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email || null,
    });
  } catch (err) {
    console.error('Verify purchase error:', err);
    return res.status(500).json({ error: 'Verification failed', message: err.message });
  }
}
