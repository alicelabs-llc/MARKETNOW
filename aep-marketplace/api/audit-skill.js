/**
 * MarketNow — Sentinel L1.5 Security Audit
 * ==========================================
 * 
 * Endpoint: POST /api/audit-skill
 * Body: { "skillId": "mn-gen-00015" }
 * 
 * Ejecuta los 6 checks de seguridad que recomienda la comunidad MCP:
 * 1. AUTH — ¿requiere autenticación o está abierto?
 * 2. TOOL DESCRIPTIONS — ¿hay prompt injection en las descripciones?
 * 3. INPUT VALIDATION — ¿valida inputs o acepta cualquier cosa?
 * 4. CORS / ORIGIN — ¿quién puede llamarlo?
 * 5. OAUTH / SCOPES — ¿los tokens están limitados?
 * 6. RATE LIMITING + ERROR LEAKAGE — ¿filtra secretos en errores?
 */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Support both POST body and GET query param
    const skillId = req.method === 'POST' 
      ? (req.body || {}).skillId 
      : req.query.skillId;

    if (!skillId) {
      return res.status(400).json({ error: 'skillId required' });
    }

    // Fetch skill
    const baseUrl = `https://${req.headers.host}`;
    const skillsRes = await fetch(`${baseUrl}/api/skills.json`);
    if (!skillsRes.ok) throw new Error('Failed to fetch skills');
    const skills = await skillsRes.json();
    const skill = skills.find(s => s.id === skillId || s.slug === skillId);
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const caps = skill.capabilities || {};
    const setup = skill.doc?.setup || {};
    const sentinel = skill.sentinel || {};
    const prompt = skill.doc?.system_prompt || '';
    const tags = skill.tags || [];
    const desc = skill.description || '';
    const allText = `${skill.name} ${desc} ${tags.join(' ')} ${prompt}`.toLowerCase();

    // ─── 1. AUTH CHECK ───────────────────────────────────────────
    const authCheck = {
      name: 'AUTH',
      status: 'unknown',
      detail: '',
      risk: 'unknown',
      recommendation: '',
    };
    
    const requiredEnv = setup.required_env || [];
    if (requiredEnv.length > 0) {
      authCheck.status = 'pass';
      authCheck.detail = `Requires ${requiredEnv.length} environment variable(s): ${requiredEnv.join(', ')}`;
      authCheck.risk = 'low';
      authCheck.recommendation = 'Verify tokens are scoped, not god-mode';
    } else if (caps.requires_auth === true) {
      authCheck.status = 'pass';
      authCheck.detail = 'Auth required (detected from capabilities)';
      authCheck.risk = 'low';
    } else {
      authCheck.status = 'warning';
      authCheck.detail = 'No authentication required. If this runs as a server, anyone with network access can call it.';
      authCheck.risk = 'medium';
      authCheck.recommendation = 'Add API key or token auth. Localhost is not a security boundary on shared/dev machines.';
    }

    // ─── 2. TOOL DESCRIPTION INJECTION CHECK ─────────────────────
    const injectionCheck = {
      name: 'TOOL_DESCRIPTIONS',
      status: 'pass',
      detail: '',
      risk: 'low',
      recommendation: '',
    };
    
    // Check for prompt injection patterns in descriptions/system_prompt
    const injectionPatterns = [
      { pattern: /ignore (all )?(previous|prior) instructions/i, severity: 'critical' },
      { pattern: /disregard (the )?(above|previous)/i, severity: 'critical' },
      { pattern: /you are now (a|an) (different|new)/i, severity: 'high' },
      { pattern: /forget (everything|all|your instructions)/i, severity: 'critical' },
      { pattern: /act as (if you are|a) (different|admin|root)/i, severity: 'high' },
      { pattern: /\/(system|admin|debug|exec|eval|shell)/i, severity: 'high' },
      { pattern: /exfiltrate|steal|send.*(to|via).*(email|webhook|discord|telegram)/i, severity: 'critical' },
      { pattern: /base64.*(decode|encode|eval|exec)/i, severity: 'high' },
    ];
    
    const foundInjections = [];
    for (const { pattern, severity } of injectionPatterns) {
      if (pattern.test(desc) || pattern.test(prompt)) {
        foundInjections.push({ pattern: pattern.source, severity });
      }
    }
    
    if (foundInjections.length > 0) {
      injectionCheck.status = 'fail';
      injectionCheck.detail = `Found ${foundInjections.length} potential prompt injection pattern(s) in tool descriptions`;
      injectionCheck.risk = foundInjections[0].severity;
      injectionCheck.recommendation = 'Treat tool descriptions as untrusted input. Sanitize before exposing to LLM.';
      injectionCheck.patterns = foundInjections;
    } else {
      injectionCheck.detail = 'No prompt injection patterns detected in descriptions or system prompt';
    }

    // ─── 3. INPUT VALIDATION CHECK ───────────────────────────────
    const validationCheck = {
      name: 'INPUT_VALIDATION',
      status: 'unknown',
      detail: '',
      risk: 'unknown',
      recommendation: '',
    };
    
    const inputTypes = caps.input_types || [];
    const hasFileAccess = allText.includes('file') || allText.includes('filesystem') || allText.includes('path');
    const hasDbAccess = allText.includes('sql') || allText.includes('database') || allText.includes('query');
    const hasHttpAccess = allText.includes('http') || allText.includes('url') || allText.includes('fetch');
    
    const risks = [];
    if (hasFileAccess) risks.push('path traversal (fs access detected)');
    if (hasDbAccess) risks.push('SQL injection (db access detected)');
    if (hasHttpAccess) risks.push('SSRF (HTTP access detected)');
    
    if (risks.length > 0) {
      validationCheck.status = 'warning';
      validationCheck.detail = `Skill has access to: ${risks.join(', ')}. Verify input validation is in place.`;
      validationCheck.risk = 'medium';
      validationCheck.recommendation = 'Test with path traversal (../../etc/passwd), SQL injection (1\' OR 1=1), and SSRF (http://169.254.169.254) payloads.';
    } else {
      validationCheck.status = 'pass';
      validationCheck.detail = 'No direct fs/db/http access detected from metadata';
      validationCheck.risk = 'low';
    }

    // ─── 4. CORS / ORIGIN CHECK ──────────────────────────────────
    const corsCheck = {
      name: 'CORS_ORIGIN',
      status: 'pass',
      detail: '',
      risk: 'low',
      recommendation: '',
    };
    
    if (caps.execution_context === 'server_side' || caps.requires_network) {
      corsCheck.status = 'warning';
      corsCheck.detail = 'Skill runs server-side or requires network. If accessible from browser, verify CORS is restricted.';
      corsCheck.risk = 'medium';
      corsCheck.recommendation = 'Set Access-Control-Allow-Origin to specific domains, not *. Verify Origin header on requests.';
    } else {
      corsCheck.detail = 'Skill runs locally (stdio/local_runtime). CORS not applicable.';
    }

    // ─── 5. OAUTH / SCOPES CHECK ─────────────────────────────────
    const oauthCheck = {
      name: 'OAUTH_SCOPES',
      status: 'unknown',
      detail: '',
      risk: 'unknown',
      recommendation: '',
    };
    
    if (requiredEnv.length > 0) {
      const hasScopedTokens = requiredEnv.some(e => 
        e.includes('KEY') || e.includes('TOKEN') || e.includes('SECRET')
      );
      if (hasScopedTokens) {
        oauthCheck.status = 'warning';
        oauthCheck.detail = `Uses API keys/tokens (${requiredEnv.join(', ')}). Verify tokens are scoped (read-only) not god-mode.`;
        oauthCheck.risk = 'medium';
        oauthCheck.recommendation = 'Use least-privilege scopes. For Stripe: read-only for analytics, restricted for charges.';
      } else {
        oauthCheck.status = 'pass';
        oauthCheck.detail = 'No OAuth tokens detected';
      }
    } else {
      oauthCheck.status = 'pass';
      oauthCheck.detail = 'No OAuth/token-based access detected';
    }

    // ─── 6. RATE LIMITING + ERROR LEAKAGE ────────────────────────
    const rateLimitCheck = {
      name: 'RATE_LIMITING_ERROR_LEAKAGE',
      status: 'warning',
      detail: '',
      risk: 'medium',
      recommendation: '',
    };
    
    const sentinelWarnings = sentinel.warnings || [];
    if (sentinelWarnings.includes('no_rate_limiting')) {
      rateLimitCheck.status = 'fail';
      rateLimitCheck.detail = 'No rate limiting detected. Skill can be called unlimited times.';
      rateLimitCheck.risk = 'high';
      rateLimitCheck.recommendation = 'Add rate limiting (e.g., 60 req/min). Without it, skill can be abused for DoS or cost bombing.';
    } else if (sentinelWarnings.includes('external_fetch_detected')) {
      rateLimitCheck.status = 'warning';
      rateLimitCheck.detail = 'External network calls detected. Verify errors don\'t leak stack traces or secrets.';
      rateLimitCheck.risk = 'medium';
      rateLimitCheck.recommendation = 'Test by sending malformed inputs. Check if error responses contain stack traces, API keys, or internal URLs.';
    } else {
      rateLimitCheck.status = 'pass';
      rateLimitCheck.detail = 'No rate limiting concerns detected from metadata';
      rateLimitCheck.risk = 'low';
    }

    // ─── BUILD REPORT ─────────────────────────────────────────────
    const checks = [authCheck, injectionCheck, validationCheck, corsCheck, oauthCheck, rateLimitCheck];
    
    const criticalCount = checks.filter(c => c.risk === 'critical').length;
    const highCount = checks.filter(c => c.risk === 'high').length;
    const mediumCount = checks.filter(c => c.risk === 'medium').length;
    const passCount = checks.filter(c => c.status === 'pass').length;
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    
    // Overall score
    let overallScore = 10;
    overallScore -= criticalCount * 4;
    overallScore -= highCount * 2;
    overallScore -= mediumCount * 1;
    overallScore -= failCount * 2;
    overallScore = Math.max(0, Math.min(10, overallScore));
    
    const report = {
      skill: {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        category: skill.category,
        price: skill.price,
        author: skill.author,
      },
      audit: {
        timestamp: new Date().toISOString(),
        auditor: 'Sentinel L1.5 (MCP Security Audit)',
        overall_score: overallScore,
        max_score: 10,
        summary: `${passCount} passed, ${warningCount} warnings, ${failCount} failed`,
        risk_level: criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : mediumCount > 0 ? 'medium' : 'low',
      },
      checks,
      recommendations: checks
        .filter(c => c.recommendation)
        .map(c => `[${c.name}] ${c.recommendation}`),
      testing_guide: {
        step1: 'Send raw JSON-RPC requests manually (not via polished client that hides errors)',
        step2: 'Test with malformed inputs — check if stack traces or secrets leak in error responses',
        step3: 'Test path traversal (../../etc/passwd) if fs access detected',
        step4: 'Test SQL injection (1\' OR 1=1) if db access detected',
        step5: 'Test SSRF (http://169.254.169.254) if http access detected',
        step6: 'Verify rate limiting by sending 100 rapid requests',
      },
    };

    return res.status(200).json(report);
  } catch (err) {
    console.error('Audit error:', err);
    return res.status(500).json({ error: 'Audit failed', message: err.message });
  }
}
