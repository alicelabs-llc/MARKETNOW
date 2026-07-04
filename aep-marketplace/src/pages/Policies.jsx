import { motion } from 'framer-motion';
import BackgroundOrbs from '../components/BackgroundOrbs';
import { useLang } from '../context/LanguageContext.jsx';

const sections = [
  {
    title: 'Terms of Service — For Agents and Humans',
    content: `By accessing or using MarketNow, you agree to be bound by these terms. MarketNow is a marketplace for MCP-compatible agent skills, designed for consumption by both autonomous agents (via the public JSON API) and human developers (via the web UI). Every skill is sold individually with a one-time payment — there are no subscriptions, no credits, and no recurring billing. Agents and users must comply with each skill's upstream open-source license (MIT, Apache-2.0, etc.) when using the installed skill.`,
  },
  {
    title: 'Pricing — Micro-Transactions for Autonomous Agents',
    content: `MarketNow uses a micro-transaction pricing model optimized for autonomous agent consumption. Every skill has a single, transparent one-time price in USD displayed on its detail page and in the /api/skills.json response:

• $0.99 — 1,321 skills (26%) — utility, single-function MCP servers
• $1.99 — 649 skills (13%) — standard integrations
• $2.99 — 2,742 skills (54%) — multi-feature tools (most common)
• $4.99 — 312 skills (6%) — sophisticated multi-endpoint tools
• $9.99 — 30 skills (0.6%) — enterprise-grade, specialized

Average price: $2.50. Minimum: $0.99. Maximum: $9.99. No skill is free — every skill requires a one-time payment, which keeps the marketplace sustainable while remaining accessible for autonomous agents. There are no subscriptions, no credits, no per-call fees, and no tiered plans. Agents can programmatically discover, evaluate, and purchase skills via the public API at /api/skills.json.`,
  },
  {
    title: 'Refund Policy',
    content: `All skill purchases are eligible for a full refund within 14 days if less than 100 API calls have been made using the license key. To request a refund, email support@alicelabs.site with your order ID. Refunds are processed back to the original payment method within 5-10 business days. Skills priced at $0.99 are still eligible for refund, but the transaction fee may exceed the refund amount in some cases.`,
  },
  {
    title: 'Privacy Policy',
    content: `MarketNow collects minimal data required to operate the marketplace: email address (for account login), payment records (processed by Stripe), and the list of skills you have purchased. We do not sell personal data. All data in transit is encrypted with TLS 1.3. We do not store credit card numbers — Stripe handles all payment data on their PCI-compliant infrastructure. Agent API consumption is logged by IP and User-Agent for rate limiting and abuse prevention, but not linked to personal identity unless you sign in.`,
  },
  {
    title: 'Skill Licensing',
    content: `Each skill on MarketNow is sourced from a real, public open-source repository. When you purchase a skill, you receive: (1) a MarketNow license key for verification, (2) the install command (typically \`npx -y @marketnow/install <slug>\`), and (3) access to the skill's documentation. The underlying open-source license (MIT, Apache-2.0, etc.) of each skill still applies to your usage of the code itself. MarketNow's value-add is curation, verification (Sentinel L1), and packaging — not the underlying code, which remains free under its original license.`,
  },
  {
    title: 'Agent API Usage',
    content: `Autonomous agents are welcome to consume the MarketNow API at /api/*. Read endpoints (skills.json, categories.json, manifest.json, agent.json) are public and require no authentication. Rate limits: 60 requests/minute for anonymous, 600/minute for authenticated. For bulk consumption, cache /api/skills.json locally and refresh at most every 24 hours — the catalog changes infrequently. The /api/agent.json endpoint provides machine-readable instructions, schema, and workflow examples specifically designed for agent consumption.`,
  },
  {
    title: 'Acceptable Use',
    content: `You agree not to use MarketNow skills for illegal activities, to violate the rights of others, or to build malicious software. Skills must not be redistributed or resold without explicit permission. MarketNow reserves the right to revoke licenses in cases of abuse, fraud, or violations of these terms. Scraping the website HTML is prohibited — use the public JSON API instead, which is designed for programmatic access.`,
  },
];

export default function Policies() {
  const { t } = useLang();
  return (
    <div className="relative min-h-screen">
      <BackgroundOrbs />
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold text-white mb-2">{t('policies.title')}</h1>
          <p className="text-zinc-400">{t('policies.subtitle')}</p>
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
