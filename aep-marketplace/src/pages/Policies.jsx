import { motion } from 'framer-motion';
import BackgroundOrbs from '../components/BackgroundOrbs';

const sections = [
  {
    title: 'Terms of Service',
    content: `By accessing or using MarketNow, you agree to be bound by these terms. MarketNow is a marketplace for MCP-compatible agent skills. Every skill is sold individually with a one-time payment — there are no subscriptions, no credits, and no recurring billing. Users must comply with each skill's upstream open-source license (MIT, Apache-2.0, etc.) when using the installed skill.`,
  },
  {
    title: 'Pricing Model',
    content: `Every skill on MarketNow has a single, transparent price in USD displayed on its detail page. You pay once and receive a license key plus installation instructions. There are no Starter, Pro, or Enterprise tiers, no credit packages, and no per-call fees. Prices are set by MarketNow based on the skill's category and complexity, and are clearly listed before checkout.`,
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
