// MarketNow v3.2 - LIVE MODE ACTIVATED
// MarketNow v3.1 - Live mode deployment
/**
 * MarketNow — Create Stripe Checkout Session
 * ===========================================
 *
 * Serverless function (Vercel) — runs server-side.
 * Needs STRIPE_SECRET_KEY environment variable.
 *
 * Endpoint: POST /api/create-checkout-session
 * Body: { "skillId": "mn-ai-00001", "affiliateCode": "aff_xxx" (optional) }
 * Returns: { "url": "https://checkout.stripe.com/...", "sessionId": "cs_xxx" }
 *
 * Deployment:
 *  1. Deploy this to Vercel (connects GitHub repo → auto-deploys)
 *  2. Set env var: STRIPE_SECRET_KEY=sk_live_xxx (in Vercel dashboard)
 *  3. Set env var: CLIENT_URL=https://marketnow.site
 *  4. Stripe webhook endpoint: https://your-vercel-app.vercel.app/api/stripe-webhook
 */

import Stripe from 'stripe';

// Initialize Stripe with the secret key (server-side only)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Client URL for redirects after checkout
const CLIENT_URL = process.env.CLIENT_URL || 'https://marketnow.site';

// MarketNow commission (20%) — stored as metadata for the webhook
const COMMISSION_RATE = 0.20;

/**
 * Fetch a skill by ID from the static JSON.
 * In production, this could query a database instead.
 */
async function getSkill(skillId) {
  try {
    // Fetch from the public API (same domain in production)
    const res = await fetch(`${CLIENT_URL}/api/skills.json`);
    if (!res.ok) throw new Error('Failed to fetch skills');
    const skills = await res.json();
    return skills.find(s => s.id === skillId || s.slug === skillId);
  } catch (err) {
    console.error('Error fetching skill:', err);
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', CLIENT_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { skillId, affiliateCode } = req.body || {};

    if (!skillId) {
      return res.status(400).json({ error: 'skillId is required' });
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      return res.status(503).json({
        error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.',
      });
    }

    // Fetch the skill
    const skill = await getSkill(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const price = Math.round((skill.price || 0) * 100); // Stripe uses cents
    if (price < 50) {
      // Stripe minimum is $0.50
      return res.status(400).json({ error: 'Price too low (minimum $0.50)' });
    }

    // Create the Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: skill.name,
              description: skill.description?.slice(0, 200) || 'MCP skill',
              metadata: {
                skill_id: skill.id,
                skill_slug: skill.slug || skill.id,
                category: skill.category || '',
                seller: skill.author || '',
              },
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${CLIENT_URL}/vault?success=true&skillId=${skillId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/skill/${skillId}?canceled=true`,
      metadata: {
        skill_id: skill.id,
        skill_slug: skill.slug || skill.id,
        skill_name: skill.name,
        skill_price: skill.price.toString(),
        commission_rate: COMMISSION_RATE.toString(),
        affiliate_code: affiliateCode || '',
        marketplace: 'marketnow',
      },
      customer_email: req.headers['x-user-email'] || undefined, // Optional: pre-fill email
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('Checkout session error:', err);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: err.message,
    });
  }
}
