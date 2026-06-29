import { motion } from 'framer-motion';
import BackgroundOrbs from '../components/BackgroundOrbs';

const sections = [
  {
    title: 'Terms of Service',
    content: `By accessing or using MarketNow, you agree to be bound by these terms. MarketNow is a marketplace for MCP-compatible agent skills. Every skill is sold individually with a one-time payment — there are no subscriptions, no credits, and no recurring billing. Users must comply with each skill's upstream open-source license (MIT, Apache-2.0, etc.) when using the installed skill.`,
  },
  {
    title: 'Pricing Model — Micro-Transactions for Agents',
    content: `MarketNow uses a micro-transaction pricing model designed for autonomous agents. Every skill has a single, transparent one-time price in USD displayed on its detail page:

• FREE — 1,329 skills (26% of catalog), mostly simple wrappers and open-source utilities
• $0.99 to $4.99 — 3,579 skills (71%), the standard range for most MCP servers
• $9.99 to $19.99 — 146 skills (3%), sophisticated multi-feature tools
• No skill exceeds $19.99 — we keep the ceiling low so agents can buy many skills without breaking budget

Average paid skill price: $3.66. There are no subscriptions, no credits, no per-call fees, and no tiered plans. Agents can programmatically discover, evaluate, and purchase skills via the public API at /api/skills.json. Humans can browse and buy via the web UI with the same transparent prices.`,
  },
  {
    title: 'Refund Policy',
    content: `Skills purchased via Stripe are eligible for a full refund within 14 days if less than 100 API calls have been made using the license key. To request a refund, email support@marketnow.site with your order ID. Refunds are processed back to the original payment method within 5-10 business days. Skills marked as Free do not require a refund.`,
  },
  {
    title: 'Privacy Policy',
    content: `MarketNow collects minimal data required to operate the marketplace: your email address (for account login), payment records (processed by Stripe), and the list of skills you have purchased. We do not sell personal data. All data in transit is encrypted with TLS 1.3. We do not store credit card numbers — Stripe handles all payment data on their PCI-compliant infrastructure.`,
  },
  {
    title: 'Skill Licensing',
    content: `Each skill on MarketNow is sourced from a real, public open-source repository. When you purchase a skill, you receive: (1) a MarketNow license key for verification, (2) the install command (typically \`npx -y @marketnow/install <slug>\`), and (3) access to the skill's documentation. The underlying open-source license (MIT, Apache-2.0, etc.) of each skill still applies to your usage of the code itself.`,
  },
  {
    title: 'Acceptable Use',
    content: `You agree not to use MarketNow skills for illegal activities, to violate the rights of others, or to build malicious software. Skills must not be redistributed or resold without explicit permission. MarketNow reserves the right to revoke licenses in cases of abuse, fraud, or violations of these terms.`,
  },
];

export default function Policies() {
  return (
    <div className="relative min-h-screen">
      <BackgroundOrbs />
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold text-white mb-2">POLICIES</h1>
          <p className="text-zinc-400">Terms, pricing, refunds, and privacy policy.</p>
        </motion.div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="premium-card"
            >
              <h2 className="text-2xl font-bold text-white mb-4">{section.title}</h2>
              <p className="text-zinc-400 leading-relaxed whitespace-pre-line">{section.content}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
