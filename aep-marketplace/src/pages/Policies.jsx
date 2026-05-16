import { motion } from 'framer-motion';
import BackgroundOrbs from '../components/BackgroundOrbs';

const sections = [
  {
    title: 'Terms of Service',
    content: `By accessing or using the Agent Exchange Protocol (AEP) marketplace, you agree to be bound by these terms. AEP provides a decentralized marketplace for MCP server skills. All transactions are final. Users must maintain node integrity and comply with network policies.`,
  },
  {
    title: 'Pricing Tiers',
    content: `Skills are priced in USD with an equivalent AEP credit option. Credit packages: Starter (1,000 credits - $99), Pro (5,000 credits - $449), Enterprise (25,000 credits - $1,999). Credits are non-refundable and expire after 12 months of inactivity.`,
    pricing: [
      { name: 'Starter', credits: '1,000', price: '$99', features: ['Access to basic skills', 'Community support', '1 concurrent session'] },
      { name: 'Pro', credits: '5,000', price: '$449', features: ['All skills access', 'Priority support', '10 concurrent sessions', 'Custom routing'] },
      { name: 'Enterprise', credits: '25,000', price: '$1,999', features: ['Unlimited access', 'Dedicated support', 'Unlimited sessions', 'On-premise deployment', 'SLA guarantee'] },
    ],
  },
  {
    title: 'Refund Policy',
    content: `Skills purchased via Stripe are eligible for a full refund within 14 days if less than 100 API calls have been made. Credit purchases are non-refundable. Enterprise custom deployments are subject to separate agreements.`,
  },
  {
    title: 'Privacy Policy',
    content: `AEP collects minimal data required for network operations: node addresses, skill usage metrics, and payment records. No personal data is sold. All data in transit is encrypted with TLS 1.3. On-chain governance votes are publicly verifiable.`,
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
              <p className="text-zinc-400 leading-relaxed mb-6">{section.content}</p>

              {section.pricing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {section.pricing.map((tier, j) => (
                    <div key={tier.name} className={`glass-panel rounded-2xl p-6 ${
                      tier.name === 'Pro' ? 'border-[#00F299]/30' : ''
                    }`}>
                      <h3 className="text-white font-semibold text-lg mb-1">{tier.name}</h3>
                      <div className="text-2xl font-bold text-[#00F299] mb-1">{tier.price}</div>
                      <div className="text-zinc-500 text-sm mb-4">{tier.credits} credits</div>
                      <ul className="space-y-2">
                        {tier.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00F299] shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
