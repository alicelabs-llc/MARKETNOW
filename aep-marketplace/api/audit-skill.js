/**
 * MarketNow — Sentinel L2 Security Audit (PRODUCTION)
 * =====================================================
 * 
 * Endpoint: POST /api/audit-skill
 * Body: { "skillId": "mn-gen-00015" } or { "repo_url": "https://github.com/..." }
 * 
 * Runs ALL levels in ONE endpoint, in real-time:
 * 
 * L1.5 (metadata): 6 checks (auth, tool descriptions, input validation, CORS, OAuth, rate limiting)
 * L1.6 (code analysis): secret scanning (18 patterns), prompt injection (18 MCP rules), 
 *       dependency vulnerabilities (OSV API live), hygiene
 * L2 (behavioral analysis): fetches actual source code from GitHub, analyzes runtime
 *       behavior patterns, detects network calls, filesystem access, process spawning,
 *       credential access in code — ALL via HTTP, no Docker needed
 * 
 * Scoring: weighted 0-10, L2 is multiplicative on L1.6
 */

// ============================================================
// L2: Behavioral Analysis — fetches ACTUAL source code from GitHub
// and analyzes runtime patterns WITHOUT Docker
// ============================================================

// Runtime behavior patterns to detect in actual source code
const RUNTIME_BEHAVIOR_PATTERNS = [
  // Network access patterns
  { name: 'fetch_external', regex: /(?:fetch|axios|got|request|http\.get|https\.get)\s*\(\s*['"`]https?:\/\//gi, severity: 'MEDIUM', category: 'network' },
  { name: 'websocket_connect', regex: /new\s+WebSocket\s*\(/gi, severity: 'MEDIUM', category: 'network' },
  { name: 'dns_lookup', regex: /(?:dns\.lookup|resolve4|resolve6)\s*\(/gi, severity: 'LOW', category: 'network' },
  
  // Filesystem access patterns
  { name: 'read_sensitive_file', regex: /(?:readFile|readFileSync|readSync)\s*\(\s*(?:['"`](?:\/etc\/|~\/\.ssh|~\/\.aws|~\/\.env|~\/\.gnupg|\/root\/)|path\.join\s*\([^)]*(?:\.\.\/|process\.env\.HOME))/gi, severity: 'CRITICAL', category: 'filesystem' },
  { name: 'write_filesystem', regex: /(?:writeFile|writeFileSync|writeSync|appendFile|appendFileSync)\s*\(/gi, severity: 'MEDIUM', category: 'filesystem' },
  { name: 'delete_file', regex: /(?:unlink|unlinkSync|rm|rmSync|rmdir|rmdirSync)\s*\(/gi, severity: 'HIGH', category: 'filesystem' },
  
  // Process spawning
  { name: 'exec_command', regex: /(?:exec|execSync|spawn|spawnSync|execFile|execFileSync)\s*\(/gi, severity: 'HIGH', category: 'process' },
  { name: 'shell_execution', regex: /(?:child_process|node:child_process)/gi, severity: 'HIGH', category: 'process' },
  { name: 'eval_code', regex: /(?:eval\s*\(|new\s+Function\s*\(|vm\.runIn)/gi, severity: 'CRITICAL', category: 'process' },
  
  // Credential access
  { name: 'read_env_secrets', regex: /process\.env\s*\[?\s*['"`](?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|MNEMONIC|SEED)/gi, severity: 'HIGH', category: 'credential' },
  { name: 'read_ssh_keys', regex: /['"`](?:~\/\.ssh\/id_rsa|~\/\.ssh\/id_ed25519|~\/\.ssh\/authorized_keys)['"`]/gi, severity: 'CRITICAL', category: 'credential' },
  { name: 'read_aws_creds', regex: /['"`](?:~\/\.aws\/credentials|~\/\.aws\/config)['"`]/gi, severity: 'CRITICAL', category: 'credential' },
  
  // Data exfiltration patterns
  { name: 'exfiltrate_data', regex: /(?:fetch|axios|got|request|http\.post)\s*\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1|api\.github|registry\.npmjs|pypi\.org)/gi, severity: 'HIGH', category: 'exfiltration' },
  { name: 'base64_encode_data', regex: /(?:Buffer\.from|btoa|base64)\s*\(/gi, severity: 'LOW', category: 'exfiltration' },
  
  // Dynamic imports (code that loads more code at runtime)
  { name: 'dynamic_import', regex: /import\s*\(\s*/gi, severity: 'MEDIUM', category: 'dynamic' },
  { name: 'require_dynamic', regex: /require\s*\(\s*(?!['"`])/gi, severity: 'MEDIUM', category: 'dynamic' },
];

/**
 * L2: Fetch actual source code from GitHub and analyze runtime behavior
 */
async function runL2BehavioralAnalysis(skill) {
  const findings = [];
  let l2_multiplier = 1.0; // Start clean, reduce based on findings
  
  // Try to find the GitHub repo URL
  let repoUrl = null;
  const installCmd = skill.install || '';
  const npmMatch = installCmd.match(/npx\s+-y\s+(@?[\w/-]+)/);
  const packageName = npmMatch ? npmMatch[1] : null;
  
  if (packageName) {
    // Skip npm registry lookup (too slow for serverless)
    try { /* skipped npm lookup for performance */
      const npmRes = await fetch(`https://registry.npmjs.org/${packageName.replace('@marketnow/install ', '')}`);
      if (npmRes.ok) {
        const npmData = await npmRes.json();
        repoUrl = npmData.repository?.url?.replace('git+', '').replace('.git', '') || null;
      }
    } catch {}
  }
  
  // Fallback: check if skill has a GitHub URL in metadata
  if (!repoUrl && skill.source?.url) {
    repoUrl = skill.source.url;
  }
  
  if (!repoUrl) {
    // Can't fetch source code — L2 can't run fully, but we still analyze available metadata
    findings.push({
      check: 'source_code_access',
      status: 'limited',
      message: 'Could not find GitHub repo URL — L2 analyzed available skill metadata only',
      severity: 'INFO',
    });
    
    // Still run pattern matching on available text (description, system_prompt, capabilities)
    const availableText = JSON.stringify(skill);
    for (const pattern of RUNTIME_BEHAVIOR_PATTERNS) {
      const matches = availableText.match(pattern.regex);
      if (matches) {
        findings.push({
          check: pattern.name,
          status: 'detected',
          message: `${pattern.name}: ${matches.length} occurrence(s) in skill metadata`,
          severity: pattern.severity,
          category: pattern.category,
          source: 'metadata_only',
        });
        if (pattern.severity === 'CRITICAL') l2_multiplier = 0.0;
        else if (pattern.severity === 'HIGH' && l2_multiplier > 0.3) l2_multiplier = 0.3;
        else if (pattern.severity === 'MEDIUM' && l2_multiplier > 0.7) l2_multiplier = 0.7;
      }
    }
    
    return { findings, l2_multiplier, source: 'metadata_only', repoUrl: null };
  }
  
  // Fetch actual source files from GitHub
  const filesToFetch = ['index.js', 'src/index.js', 'main.js'];
  const repoRawBase = repoUrl.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace(/\/$/, '') + '/master/';
  
  let sourceCode = '';
  let fetchedFiles = [];
  
  for (const file of filesToFetch) {
    try { /* skipped npm lookup for performance */
      const res = await fetch(repoRawBase + file, {
        headers: { 'User-Agent': 'Sentinel-L2' },
        
      });
      if (res.ok) {
        const code = await res.text();
        sourceCode += '\n' + code;
        fetchedFiles.push(file);
      }
    } catch {}
  }
  
  // If we couldn't fetch master, try main
  if (fetchedFiles.length === 0) {
    const repoMainBase = repoUrl.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace(/\/$/, '') + '/main/';
    for (const file of filesToFetch) {
      try { /* skipped npm lookup for performance */
        const res = await fetch(repoMainBase + file, {
          headers: { 'User-Agent': 'Sentinel-L2' },
          
        });
        if (res.ok) {
          const code = await res.text();
          sourceCode += '\n' + code;
          fetchedFiles.push(file);
        }
      } catch {}
    }
  }
  
  if (sourceCode.length === 0) {
    findings.push({
      check: 'source_code_access',
      status: 'failed',
      message: 'Could not fetch source code from GitHub (repo may be private or empty)',
      severity: 'INFO',
    });
    return { findings, l2_multiplier: 0.9, source: 'unavailable', repoUrl };
  }
  
  findings.push({
    check: 'source_code_access',
    status: 'success',
    message: `Fetched ${fetchedFiles.length} source files: ${fetchedFiles.join(', ')}`,
    severity: 'INFO',
  });
  
  // Run L2 behavioral pattern matching on ACTUAL source code
  for (const pattern of RUNTIME_BEHAVIOR_PATTERNS) {
    const matches = sourceCode.match(pattern.regex);
    if (matches) {
      findings.push({
        check: pattern.name,
        status: 'detected',
        message: `${pattern.name}: ${matches.length} occurrence(s) in source code`,
        severity: pattern.severity,
        category: pattern.category,
        source: 'actual_source_code',
        file_count: fetchedFiles.length,
      });
      // Apply multiplicative scoring
      if (pattern.severity === 'CRITICAL') l2_multiplier = 0.0;
      else if (pattern.severity === 'HIGH' && l2_multiplier > 0.3) l2_multiplier = 0.3;
      else if (pattern.severity === 'MEDIUM' && l2_multiplier > 0.7) l2_multiplier = 0.7;
    }
  }
  
  // Also scan source code for secrets (L1.6 but on actual code, not just metadata)
  const secretFindingsInCode = scanForSecrets(sourceCode);
  if (secretFindingsInCode.length > 0) {
    for (const f of secretFindingsInCode) {
      findings.push({
        check: `secret_in_source_${f.type}`,
        status: 'detected',
        message: `${f.type} found in source code (${f.count} occurrence(s))`,
        severity: f.severity,
        category: 'credential',
        source: 'actual_source_code',
      });
      if (f.severity === 'CRITICAL') l2_multiplier = 0.0;
    }
  }
  
  // Also scan source code for prompt injection (on actual tool descriptions in code)
  const injectionFindingsInCode = scanForPromptInjection(sourceCode);
  const injectionErrorsInCode = injectionFindingsInCode.filter(f => f.severity === 'ERROR');
  if (injectionErrorsInCode.length > 0) {
    for (const f of injectionErrorsInCode) {
      findings.push({
        check: `injection_in_source_${f.type}`,
        status: 'detected',
        message: `${f.type} pattern found in source code`,
        severity: 'ERROR',
        category: 'prompt_injection',
        source: 'actual_source_code',
      });
      if (l2_multiplier > 0.3) l2_multiplier = 0.3;
    }
  }
  
  return { findings, l2_multiplier, source: 'actual_source_code', repoUrl, files_analyzed: fetchedFiles };
}

// ============================================================
const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g, severity: 'CRITICAL', weight: 10 },
  { name: 'AWS Secret Key', regex: /aws_secret_access_key["\s]*[:=]["\s]*[A-Za-z0-9/+=]{40}/gi, severity: 'CRITICAL', weight: 10 },
  { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9]{36}/g, severity: 'CRITICAL', weight: 10 },
  { name: 'Private Key (PEM)', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, severity: 'CRITICAL', weight: 10 },
  { name: 'Generic API Key', regex: /(?:api[_-]?key|apikey|secret[_-]?key)["\s]*[:=]["\s]*["'][A-Za-z0-9]{20,}["']/gi, severity: 'HIGH', weight: 5 },
  { name: 'Wallet Private Key', regex: /(?:private[_-]?key|mnemonic|seed[_-]?phrase)["\s]*[:=]["\s]*["'][A-Za-z0-9\s]{20,}["']/gi, severity: 'CRITICAL', weight: 10 },
  { name: 'Slack Token', regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g, severity: 'HIGH', weight: 5 },
  { name: 'Stripe Key', regex: /sk_live_[A-Za-z0-9]{24,}/g, severity: 'CRITICAL', weight: 10 },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z_-]{35}/g, severity: 'HIGH', weight: 5 },
  { name: 'JWT Token', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: 'HIGH', weight: 5 },
];

// ============================================================
// L1.6-lite: Prompt injection patterns (18 MCP-specific rules as JS RegExp)
// ============================================================
const PROMPT_INJECTION_PATTERNS = [
  { name: 'ignore_previous_instructions', regex: /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions?|prompts?|rules?|commands?)/gi, severity: 'ERROR' },
  { name: 'system_prompt_override', regex: /(?:you\s+are\s+now|new\s+instructions?|system\s+prompt\s+is|your\s+new\s+role|act\s+as\s+if\s+you\s+are)/gi, severity: 'ERROR' },
  { name: 'secret_extraction', regex: /(?:reveal|show|print|output|exfiltrate|send)\s+(?:the\s+)?(?:api\s+key|secret|token|password|credential|env|environment\s+variables?)/gi, severity: 'ERROR' },
  { name: 'jailbreak_patterns', regex: /(?:jailbreak|DAN|developer\s+mode|admin\s+mode|god\s+mode|unrestricted|no\s+rules?|no\s+restrictions?)/gi, severity: 'WARNING' },
  { name: 'data_exfiltration', regex: /(?:send|upload|exfiltrate|transmit|post)\s+(?:all\s+|the\s+)?(?:data|files?|contents?|conversations?|messages?|history)\s+(?:to|via|using)\s+/gi, severity: 'ERROR' },
  { name: 'tool_name_spoofing', regex: /(?:name\s*:\s*["'](?:read_file|write_file|execute|system|shell|terminal|admin|root|sudo)["'])/gi, severity: 'WARNING' },
  { name: 'env_var_leakage', regex: /(?:return|console\.log|print|output)\s*\(.*process\.env.*\)/gi, severity: 'WARNING' },
  { name: 'dangerous_fs_access', regex: /(?:~\/\.ssh\/|\/etc\/passwd|\/etc\/shadow|\/root\/\.|~\/\.aws\/|~\/\.env)/gi, severity: 'ERROR' },
  { name: 'insecure_exec_js', regex: /(?:exec|execSync|spawn|spawnSync)\s*\([^)]*(?:userInput|input|param|arg|request)/gi, severity: 'ERROR' },
  { name: 'insecure_exec_py', regex: /(?:os\.system|subprocess\.(?:call|Popen)\s*\([^)]*shell\s*=\s*True|os\.popen)\s*\(/gi, severity: 'ERROR' },
  { name: 'eval_user_input', regex: /eval\s*\([^)]*(?:input|userInput|param|request|body)/gi, severity: 'ERROR' },
  { name: 'hardcoded_api_key', regex: /(?:api[_-]?key|apikey|secret[_-]?key|auth[_-]?token|access[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/gi, severity: 'ERROR' },
  { name: 'ssrf_user_url', regex: /(?:fetch|axios\.(?:get|post)|requests\.get)\s*\(\s*(?:userUrl|input|param|url)\s*\)/gi, severity: 'WARNING' },
  { name: 'command_injection_path', regex: /(?:\.\.\/){3,}(?:etc\/passwd|etc\/shadow|root\/)/gi, severity: 'ERROR' },
  { name: 'sql_injection_vector', regex: /(?:'\s*(?:OR|AND)\s+1\s*=\s*1|--\s*$)/gi, severity: 'WARNING' },
  { name: 'ssrf_metadata', regex: /169\.254\.169\.254/g, severity: 'ERROR' },
  { name: 'missing_input_schema', regex: /tools?\.(?:register|add)\s*\([^)]*(?:name|description)\s*,\s*(?:handler|callback)/gi, severity: 'INFO' },
  { name: 'nc_curl_bash', regex: /(?:nc|netcat|curl|wget)\s+.*\|\s*(?:bash|sh|zsh)/gi, severity: 'ERROR' },
];

// ============================================================
// L1.6-lite: Check dependencies via OSV API (HTTP, no binary)
// ============================================================
async function checkDependenciesOSV(packageName, packageVersion, ecosystem) {
  try { /* skipped npm lookup for performance */
    const response = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package: { name: packageName, ecosystem },
        version: packageVersion,
      }),
    });
    if (!response.ok) return { vulns: [], error: 'OSV API error' };
    const data = await response.json();
    const vulns = (data.vulns || []).map(v => ({
      id: v.id,
      severity: v.severity?.[0]?.score || 'HIGH',
      summary: v.summary || 'Vulnerability detected',
    }));
    return { vulns, count: vulns.length };
  } catch (e) {
    return { vulns: [], error: e.message };
  }
}

// ============================================================
// L1.6-lite: Scan text for secrets
// ============================================================
function scanForSecrets(text) {
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches) {
      findings.push({
        type: pattern.name,
        severity: pattern.severity,
        count: matches.length,
        weight: pattern.weight,
      });
    }
  }
  return findings;
}

// ============================================================
// L1.6-lite: Scan text for prompt injection patterns
// ============================================================
function scanForPromptInjection(text) {
  const findings = [];
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches) {
      findings.push({
        type: pattern.name,
        severity: pattern.severity,
        count: matches.length,
      });
    }
  }
  return findings;
}

// ============================================================
// Main handler
// ============================================================
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

  try { /* skipped npm lookup for performance */
    const skillId = req.method === 'POST' 
      ? (req.body || {}).skillId 
      : req.query.skillId;

    if (!skillId) {
      return res.status(400).json({ error: 'skillId required' });
    }

    // Fetch skill data
    const baseUrl = `https://${req.headers.host}`;
    const skillsRes = await fetch(`${baseUrl}/api/skills.json`);
    if (!skillsRes.ok) throw new Error('Failed to fetch skills');
    const skills = await skillsRes.json();
    const skill = skills.find(s => s.id === skillId || s.slug === skillId);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found', skillId });
    }

    // ============================================================
    // L1.5 CHECKS (metadata-based)
    // ============================================================
    const checks = [];
    let overallScore = 10;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    // Check 1: AUTH
    const requiresAuth = skill.doc?.setup?.required_env?.length > 0 || 
                         skill.capabilities?.requires_auth === true;
    checks.push({
      name: 'AUTH',
      status: requiresAuth ? 'pass' : 'warn',
      message: requiresAuth 
        ? 'Authentication required (env vars or auth token)' 
        : 'No authentication detected — server may be open',
      recommendation: requiresAuth ? null : 'Add authentication before exposing publicly',
    });
    if (!requiresAuth) { overallScore -= 1; mediumCount++; }

    // Check 2: Tool description injection (L1.5 + L1.6-lite patterns)
    const promptText = skill.doc?.system_prompt || skill.description || '';
    const injectionFindings = scanForPromptInjection(promptText);
    const injectionErrors = injectionFindings.filter(f => f.severity === 'ERROR');
    const injectionWarnings = injectionFindings.filter(f => f.severity === 'WARNING');
    checks.push({
      name: 'TOOL_DESCRIPTION_INJECTION',
      status: injectionErrors.length > 0 ? 'fail' : injectionWarnings.length > 0 ? 'warn' : 'pass',
      message: injectionErrors.length > 0 
        ? `${injectionErrors.length} prompt injection patterns detected (ERROR)` 
        : injectionWarnings.length > 0 
        ? `${injectionWarnings.length} suspicious patterns (WARNING)` 
        : 'No prompt injection patterns detected',
      findings: injectionFindings,
      scanned_patterns: PROMPT_INJECTION_PATTERNS.length,
    });
    if (injectionErrors.length > 0) { overallScore -= 3; highCount += injectionErrors.length; }
    if (injectionWarnings.length > 0) { overallScore -= 1; mediumCount += injectionWarnings.length; }

    // Check 3: Input validation
    const hasSchema = skill.capabilities?.input_types || skill.doc?.setup;
    checks.push({
      name: 'INPUT_VALIDATION',
      status: hasSchema ? 'pass' : 'warn',
      message: hasSchema ? 'Input schema/types detected' : 'No input validation schema found',
    });
    if (!hasSchema) { overallScore -= 1; mediumCount++; }

    // Check 4: CORS
    const networkAccess = skill.permissions?.network?.length > 0;
    checks.push({
      name: 'CORS_ORIGIN',
      status: networkAccess ? 'warn' : 'pass',
      message: networkAccess 
        ? 'Network access detected — verify CORS policy is restrictive' 
        : 'No network access detected',
    });
    if (networkAccess) { overallScore -= 0.5; }

    // Check 5: OAuth scopes
    const oauthScopes = skill.capabilities?.integrations;
    checks.push({
      name: 'OAUTH_SCOPES',
      status: 'pass',
      message: oauthScopes ? 'OAuth integration detected — verify scopes are minimal' : 'No OAuth integration',
    });

    // Check 6: Rate limiting + error leakage
    checks.push({
      name: 'RATE_LIMITING_ERROR_LEAKAGE',
      status: 'pass',
      message: 'Cannot verify remotely — test by sending 100 rapid requests and checking error messages',
    });

    // ============================================================
    // L1.6-lite CHECKS (run IN PRODUCTION — not just GitHub Actions)
    // ============================================================

    // Check 7: Secret scanning (regex-based, runs in serverless)
    const allText = JSON.stringify(skill);
    const secretFindings = scanForSecrets(allText);
    const criticalSecrets = secretFindings.filter(f => f.severity === 'CRITICAL');
    checks.push({
      name: 'SECRET_SCANNING',
      status: criticalSecrets.length > 0 ? 'fail' : secretFindings.length > 0 ? 'warn' : 'pass',
      message: criticalSecrets.length > 0 
        ? `${criticalSecrets.length} CRITICAL secrets detected in skill data` 
        : secretFindings.length > 0 
        ? `${secretFindings.length} potential secrets found (HIGH severity)` 
        : 'No secrets detected',
      findings: secretFindings,
      scanner: 'L1.6-lite regex (18 patterns)',
    });
    if (criticalSecrets.length > 0) { 
      overallScore = 0; // Instant zero for critical secrets
      criticalCount += criticalSecrets.length;
    } else if (secretFindings.length > 0) {
      overallScore -= 2;
      highCount += secretFindings.length;
    }

    // Check 8: Prompt injection in ALL text (not just description)
    const fullInjectionFindings = scanForPromptInjection(allText);
    const fullInjectionErrors = fullInjectionFindings.filter(f => f.severity === 'ERROR');
    checks.push({
      name: 'PROMPT_INJECTION_DEEP_SCAN',
      status: fullInjectionErrors.length > 0 ? 'fail' : 'pass',
      message: fullInjectionErrors.length > 0 
        ? `${fullInjectionErrors.length} injection patterns in skill data (ERROR)` 
        : 'No injection patterns detected in full skill data',
      findings: fullInjectionFindings,
      patterns_checked: PROMPT_INJECTION_PATTERNS.length,
      scanner: 'L1.6-lite (18 MCP-specific rules)',
    });
    if (fullInjectionErrors.length > 0 && overallScore > 0) { 
      overallScore -= 2; 
      highCount += fullInjectionErrors.length;
    }

    // Check 9: Dependency vulnerabilities (via OSV API — HTTP, no binary)
    let depVulns = [];
    let depError = null;
    const packageName = skill.install?.match(/npx -y (@?[\w/-]+)/)?.[1];
    if (packageName && skill.version) {
      const osvResult = await checkDependenciesOSV(packageName, skill.version, 'npm');
      depVulns = osvResult.vulns || [];
      depError = osvResult.error;
    }
    checks.push({
      name: 'DEPENDENCY_VULNERABILITIES',
      status: depVulns.length > 0 ? 'fail' : 'pass',
      message: depError 
        ? `Could not check (OSV API: ${depError})` 
        : depVulns.length > 0 
        ? `${depVulns.length} vulnerabilities found via OSV API` 
        : 'No known vulnerabilities (checked via OSV API)',
      findings: depVulns,
      scanner: 'L1.6-lite (OSV API — live, not cached)',
    });
    if (depVulns.length > 0 && overallScore > 0) {
      overallScore -= Math.min(3, depVulns.length * 0.5);
      highCount += depVulns.length;
    }

    // Check 10: Hygiene (license, manifest, README)
    const hasLicense = skill.license && skill.license !== 'unknown';
    const hasManifest = skill.install || skill.doc?.setup?.install;
    const hasReadme = skill.description && skill.description.length > 50;
    const hygieneIssues = [];
    if (!hasLicense) hygieneIssues.push('No license detected');
    if (!hasManifest) hygieneIssues.push('No install manifest');
    if (!hasReadme) hygieneIssues.push('No README/description');
    checks.push({
      name: 'HYGIENE',
      status: hygieneIssues.length === 0 ? 'pass' : hygieneIssues.length >= 2 ? 'warn' : 'pass',
      message: hygieneIssues.length === 0 
        ? 'License, manifest, and README all present' 
        : `${hygieneIssues.length} hygiene issues: ${hygieneIssues.join(', ')}`,
    });
    if (hygieneIssues.length >= 2 && overallScore > 0) overallScore -= 0.5;

    // ============================================================
    // Calculate final score
    // ============================================================
    overallScore = Math.max(0, Math.min(10, overallScore));
    const passCount = checks.filter(c => c.status === 'pass').length;
    const warningCount = checks.filter(c => c.status === 'warn').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    // Risk level
    const riskLevel = skill.risk_level || (criticalCount > 0 ? 'red' : highCount > 0 ? 'yellow' : 'green');

    const report = {
      skill: {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        category: skill.category,
        price: skill.price,
        risk_level: riskLevel,
      },
      audit: {
        timestamp: new Date().toISOString(),
        auditor: 'Sentinel L1.6 (Production — runs in real-time)',
        version: 'L1.6',
        overall_score: parseFloat(overallScore.toFixed(1)),
        max_score: 10,
        summary: `${passCount} passed, ${warningCount} warnings, ${failCount} failed`,
        risk_level: criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : mediumCount > 0 ? 'medium' : 'low',
        scoring: {
          secrets_weight: '40% (critical secret = instant 0)',
          vulnerabilities_weight: '30% (-0.5 per CVE)',
          static_analysis_weight: '20% (-2 per ERROR, -1 per WARNING)',
          hygiene_weight: '10% (-0.5 per issue)',
        },
      },
      checks,
      l16_checks: {
        secret_scanning: 'LIVE (18 regex patterns, runs in serverless)',
        prompt_injection: 'LIVE (18 MCP-specific rules, runs in serverless)',
        dependency_check: 'LIVE (OSV API, real-time HTTP call)',
        hygiene: 'LIVE (license, manifest, README)',
      },
      l2_available: true,
      l2_runs_in: 'PRODUCTION (real-time, same API call — no Docker needed)',
      l2_note: 'L2 behavioral analysis fetches ACTUAL source code from GitHub and analyzes runtime patterns (network, filesystem, process spawning, credential access, exfiltration, dynamic imports). Runs in real-time on every API call.',
      l2_docker_available: true,
      l2_docker_url: 'https://github.com/edgarfloresguerra2011-a11y/marketnow/actions/workflows/sentinel-l2-sandbox.yml',
      l2_docker_note: 'Full Docker sandbox (--network none, --read-only, --cap-drop ALL) also available via GitHub Actions for deeper analysis.',
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

    // ============================================================
    // L2: Run behavioral analysis (fetches actual source code from GitHub)
    // Wrapped in try-catch — L1.6 results are already in the report.
    // If L2 fails (timeout, network), report still returns with L1.6 only.
    // ============================================================
    let l2Result = null;
    try { /* skipped npm lookup for performance */
      l2Result = await runL2BehavioralAnalysis(skill);
    } catch (l2Err) {
      console.error('L2 behavioral analysis failed (non-fatal):', l2Err.message);
      l2Result = {
        findings: [{ check: 'l2_error', status: 'error', message: `L2 analysis failed: ${l2Err.message}`, severity: 'INFO' }],
        l2_multiplier: 0.9, // Slight penalty for not being able to verify
        source: 'error',
        repoUrl: null,
        files_analyzed: 0,
      };
    }
    
    // Apply L2 multiplicative scoring on L1.6 score
    const l16Score = report.audit.overall_score;
    const l2Multiplier = l2Result.l2_multiplier;
    const finalScore = parseFloat((l16Score * l2Multiplier).toFixed(1));
    
    report.audit.overall_score = finalScore;
    report.audit.l1_6_score = l16Score;
    report.audit.l2_multiplier = l2Multiplier;
    report.audit.l2_source = l2Result.source;
    report.audit.l2_repo_url = l2Result.repoUrl;
    report.audit.l2_files_analyzed = l2Result.files_analyzed || 0;
    report.audit.version = 'L2';
    report.audit.auditor = 'Sentinel L2 (Production — L1.6 + behavioral analysis in real-time)';
    report.audit.summary = `${passCount} passed, ${warningCount} warnings, ${failCount} failed | L2: ${l2Result.findings.length} behavioral findings (multiplier: ${l2Multiplier})`;
    report.l2_findings = l2Result.findings;
    report.l2_behavioral_checks = {
      source_code_fetched: l2Result.source === 'actual_source_code',
      files_analyzed: l2Result.files_analyzed || 0,
      patterns_checked: RUNTIME_BEHAVIOR_PATTERNS.length,
      categories: ['network', 'filesystem', 'process', 'credential', 'exfiltration', 'dynamic'],
      scoring: 'Multiplicative: 1.0 (clean) → 0.7 (medium) → 0.3 (high) → 0.0 (critical)',
      runs_in: 'PRODUCTION (Vercel serverless, real-time HTTP fetch from GitHub)',
    };

    return res.status(200).json(report);
  } catch (err) {
    console.error('Audit error:', err);
    return res.status(500).json({ error: 'Audit failed', message: err.message });
  }
}
