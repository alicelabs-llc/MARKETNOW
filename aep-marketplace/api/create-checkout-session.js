// MarketNow v3.2 - LIVE MODE ACTIVATED
/**
 * MarketNow — Create Stripe Checkout Session
 * ===========================================
 *
 * v2.0 — Concurrency fixes (4 julio 2026)
 *   - Usa skills-cache.mjs (no fetch de 30MB por request)
 *   - Rate limiting REAL por IP (20 req/min — money involved)
 */

import Stripe from 'stripe';
import { findSkill } from '../lib/skills-cache.mjs';
import { checkRateLimit } from '../lib/rate-limit.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const CLIENT_URL = process.env.CLIENT_URL || 'https://marketnow.site';
const COMMISSION_RATE = 0.20;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', CLIENT_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ===== FIX: Rate limiting REAL =====
  if (checkRateLimit(req, res, 'purchase')) return;

  try {
    const { skillId, affiliateCode } = req.body || {};

    if (!skillId) {
      return res.status(400).json({ error: 'skillId is required' });
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      return res.status(503).json({
        error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.',
      });
    }

    // ===== FIX: cache en memoria =====
    const skill = await findSkill(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const price = Math.round((skill.price || 0) * 100);
    if (price < 50) {
      return res.status(400).json({ error: 'Price too low (minimum $0.50)' });
    }

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
      customer_email: req.headers['x-user-email'] || undefined,
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
