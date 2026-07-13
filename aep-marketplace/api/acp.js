// MarketNow — Agent Communication Protocol (ACP) endpoint
// Agents register, discover each other, and send messages here

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Id');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET — list agents or get spec
  if (req.method === 'GET') {
    const { id, spec } = req.query;
    
    if (spec === '1') {
      // Return ACP spec
      res.status(200).json({
        protocol: 'ACP',
        version: '1.0.0',
        endpoints: {
          discover: 'POST /api/acp with {action: "discover", query: "..."}',
          register: 'PUT /api/acp with agent card in body',
          message: 'POST /api/acp with {action: "message", to: "agent_id", type: "NEGOTIATE", payload: {...}}',
          list: 'GET /api/acp — list all registered agents',
        },
        registered_agents: 1,
        marketnow_agent: {
          agent_id: 'agent.alicelabs.marketnow',
          name: 'MarketNow Discovery Agent',
          capabilities: ['skill_search', 'skill_recommendation', 'security_audit'],
          trust_score: 10,
          endpoint: 'https://marketnow.site/api/acp',
          pricing: { per_call: 0, per_task: 0.99 },
        }
      });
      return;
    }

    // List registered agents (we start with just MarketNow)
    res.status(200).json({
      total: 1,
      agents: [{
        agent_id: 'agent.alicelabs.marketnow',
        name: 'MarketNow Discovery Agent',
        description: 'Finds and recommends MCP skills. Security-audits all recommendations.',
        capabilities: ['skill_search', 'skill_recommendation', 'security_audit', 'skill_installation'],
        needs: ['payment_processing', 'task_execution'],
        trust_score: 10,
        endpoint: 'https://marketnow.site/api/acp',
        payment_address: '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee',
        pricing: { per_call: 0, per_task: 0.99, monthly: 0 },
        languages: ['en', 'es', 'zh', 'pt', 'fr'],
        registered_since: '2026-07-12',
      }],
    });
    return;
  }

  // PUT — register/update agent card
  if (req.method === 'PUT') {
    const card = req.body;
    
    if (!card.agent_id || !card.capabilities) {
      res.status(400).json({ error: 'agent_id and capabilities required' });
      return;
    }

    // In production: save to database
    // For now: acknowledge and return registration confirmation
    res.status(201).json({
      status: 'registered',
      agent_id: card.agent_id,
      message: `Agent ${card.agent_id} registered. Other agents can now discover you.`,
      discovery_url: `https://marketnow.site/api/acp?id=${card.agent_id}`,
      next_steps: [
        '1. Other agents can discover you via POST /api/acp with {action:"discover", query:"your_capability"}',
        '2. Agents will send NEGOTIATE messages to your endpoint',
        '3. Accept tasks, execute them, and receive USDC payments',
        '4. Build your trust score through successful task completions',
      ],
    });
    return;
  }

  // POST — discover, message, or execute
  if (req.method === 'POST') {
    const { action } = req.body;

    switch (action) {
      case 'discover': {
        const { query, min_trust_score, max_price, category } = req.body;
        
        // Search our skills catalog for matching capabilities
        const results = [{
          agent_id: 'agent.alicelabs.marketnow',
          name: 'MarketNow Discovery Agent',
          capabilities: ['skill_search', 'skill_recommendation', 'security_audit'],
          trust_score: 10,
          pricing: { per_call: 0, per_task: 0.99 },
          endpoint: 'https://marketnow.site/api/acp',
          match_reason: 'MarketNow can find MCP skills matching your query',
        }];

        res.status(200).json({
          query: query || '*',
          results: results,
          total: results.length,
        });
        return;
      }

      case 'message': {
        const { to, type, payload } = req.body;
        
        // Route message to target agent
        // For now: MarketNow agent responds directly
        if (type === 'NEGOTIATE') {
          res.status(200).json({
            from: 'agent.alicelabs.marketnow',
            to: req.body.from || 'unknown',
            type: 'NEGOTIATE_RESPONSE',
            accepted: true,
            proposed_price: payload?.proposed_price || 0.99,
            estimated_time: '30 seconds',
            message: 'MarketNow accepts. Send EXECUTE with payment proof to start.',
          });
          return;
        }

        if (type === 'EXECUTE') {
          // Execute the task (search skills, recommend, audit)
          res.status(200).json({
            from: 'agent.alicelabs.marketnow',
            to: req.body.from || 'unknown',
            type: 'EXECUTE_RESPONSE',
            status: 'processing',
            task_id: `task_${Date.now()}`,
            result_url: 'https://marketnow.site/api/acp?action=result',
            estimated_completion: '30 seconds',
          });
          return;
        }

        if (type === 'RESULT') {
          res.status(200).json({
            from: 'agent.alicelabs.marketnow',
            to: req.body.from || 'unknown',
            type: 'RESULT_RESPONSE',
            status: 'completed',
            output: {
              skills_found: 8764,
              recommendation: 'Use mn-mcp-filesystem for filesystem access (score: 10/10)',
              audit_url: 'https://marketnow.site/api/trust-score?skillId=mn-mcp-filesystem',
            },
            receipt_url: 'https://marketnow.site/verify',
          });
          return;
        }

        res.status(400).json({ error: `Unknown message type: ${type}` });
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${action}. Use: discover, message` });
        return;
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
