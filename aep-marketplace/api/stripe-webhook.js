/**
 * MarketNow — Stripe Webhook Handler
 * ===================================
 *
 * Serverless function (Vercel) — receives Stripe webhooks.
 * Needs STRIPE_WEBHOOK_SECRET environment variable.
 *
 * Endpoint: POST /api/stripe-webhook
 *
 * Setup:
 *  1. Deploy this function to Vercel
 *  2. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
 *  3. URL: https://your-vercel-app.vercel.app/api/stripe-webhook
 *  4. Events to send: checkout.session.completed, payment_intent.payment_failed
 *  5. Copy the signing secret (whsec_xxx)
 *  6. Set env var: STRIPE_WEBHOOK_SECRET=whsec_xxx (in Vercel)
 *
 * What this does:
 *  - On successful payment: marks the skill as purchased for the buyer
 *  - Records the commission (20% MarketNow, 80% seller, 5% affiliate if applicable)
 *  - Triggers an email receipt (future: via SendGrid/Resend)
 *  - Updates the buyer's vault
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const CLIENT_URL = process.env.CLIENT_URL || 'https://marketnow.site';

/**
 * Verify the webhook signature (security critical).
 */
function verifySignature(payload, signature, secret) {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return null;
  }
}

/**
 * Process a successful checkout.
 * In production, this would:
 *  1. Save the purchase to a database
 *  2. Generate a license key
 *  3. Send an email receipt
 *  4. Update the seller's balance
 *  5. Update the affiliate's balance (if affiliate_code in metadata)
 */
async function handleCheckoutComplete(session) {
  const metadata = session.metadata || {};
  const skillId = metadata.skill_id;
  const skillName = metadata.skill_name;
  const skillPrice = parseFloat(metadata.skill_price || '0');
  const commissionRate = parseFloat(metadata.commission_rate || '0.20');
  const affiliateCode = metadata.affiliate_code || '';

  const sellerEarnings = skillPrice * (1 - commissionRate);
  const marketnowRevenue = skillPrice * commissionRate;
  const affiliatePayout = affiliateCode ? skillPrice * 0.05 : 0;

  console.log('✅ Payment successful:', {
    sessionId: session.id,
    skillId,
    skillName,
    price: skillPrice,
    sellerEarnings,
    marketnowRevenue,
    affiliatePayout,
    affiliateCode,
    customerEmail: session.customer_email || session.customer_details?.email,
  });

  // TODO: In production, save to database:
  // await db.purchase.create({
  //   id: session.id,
  //   skillId,
  //   buyerEmail: session.customer_email,
  //   price: skillPrice,
  //   sellerEarnings,
  //   marketnowRevenue,
  //   affiliatePayout,
  //   affiliateCode,
  //   licenseKey: generateLicenseKey(),
  //   purchasedAt: new Date(),
  //   status: 'completed',
  // });

  // TODO: Send receipt email
  // await sendEmail(session.customer_email, 'receipt', { skillName, price: skillPrice });

  // TODO: Update seller balance
  // await db.seller.updateBalance(skill.author, sellerEarnings);

  // TODO: Update affiliate balance
  // if (affiliateCode) await db.affiliate.updateBalance(affiliateCode, affiliatePayout);

  return { success: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY FIX 3.1: Use raw body for Stripe signature verification
  // Stripe signs the exact bytes it sends. If Vercel's body parser
  // already parsed req.body into an object, JSON.stringify won't
  // reproduce the exact original bytes (key order, whitespace).
  // Solution: disable body parser (in config below) and read raw buffer.
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf-8');
  
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  // Verify the webhook signature with the RAW body
  const event = verifySignature(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (!event) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('❌ Payment failed:', paymentIntent.id);
        // TODO: Log the failure, notify the buyer
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        console.log('💸 Refund processed:', charge.id);
        // TODO: Revoke the license, update seller balance (deduct)
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// SECURITY FIX 3.1: Disable body parser so we get the raw body
// This is required for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
