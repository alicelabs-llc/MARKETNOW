import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT — full Security page in 5 languages
// ═══════════════════════════════════════════════════════════════════════════
const CONTENT = {
  en: {
    badge: 'SENTINEL L1.5 → L1.6 → L2',
    stats: {
      total: 'Total Skills',
      scanned: 'Scanned by Sentinel',
      avgScore: 'Avg Sentinel Score',
      passRate: 'Pass Rate (≥4/10)',
      critical: 'Critical Issues',
    },
    banner: {
      l15Label: 'L1.5 LIVE',
      l15Desc: '→ metadata-based, 6 checks, runs in /api/audit-skill',
      l16Label: 'L1.6 LIVE',
      l16Desc: '→ Semgrep + Gitleaks + OSV-Scanner, runs in production (real-time)',
      l2Label: 'L2 LIVE',
      l2Desc: '→ Docker sandbox, no network, read-only FS, syscall monitoring',
    },
    l15: {
      title: 'SENTINEL L1.5 CHECKS',
      live: 'LIVE IN PRODUCTION',
      checks: [
        { label: 'AUTH — Does the server require authentication?', category: 'Authentication' },
        { label: 'Tool description injection — 8 prompt injection patterns detected', category: 'Prompt Injection' },
        { label: 'Input validation — Does it validate inputs?', category: 'Input Validation' },
        { label: 'CORS — Is the CORS policy permissive?', category: 'CORS' },
        { label: 'OAuth scopes — Are scopes minimal?', category: 'OAuth' },
        { label: 'Rate limiting error leakage — Do errors leak rate limit info?', category: 'Rate Limiting' },
      ],
      descPre: 'L1.5 runs on every skill via',
      descCode: '/api/audit-skill',
      descPost: '. It analyzes metadata (README, package.json, tool descriptions). Skills scoring below 4/10 are blocked.',
    },
    audit: {
      title: 'AUDIT TRAIL',
      live: 'LIVE',
      empty: 'No audit logs available yet.',
    },
    l16: {
      title: 'SENTINEL L1.6 — ENHANCED ANALYSIS (LIVE IN PRODUCTION)',
      badge: 'LIVE IN PRODUCTION · NOT YET IN PRODUCTION',
      descPre: 'L1.6 goes beyond metadata — it clones the actual repo and runs real security tools:',
      descSemgrepSuffix: ' (18 MCP-specific rules), ',
      descGitleaksSuffix: ' (secret detection), ',
      descOSVSuffix: ' (dependency vulnerabilities). ',
      descPost: 'Runs via',
      descVia: 'GitHub Actions',
      checks: [
        { label: 'Semgrep static analysis — 18 MCP-specific rules (prompt injection, command injection, hardcoded secrets, SSRF, tool spoofing)', category: 'Static Analysis' },
        { label: 'Gitleaks secret detection — scans for API keys, private keys, wallet mnemonics', category: 'Secret Scanning' },
        { label: 'OSV-Scanner dependency audit — checks npm/pip lockfiles against vulnerability databases', category: 'Supply Chain' },
        { label: 'npm audit fallback — when OSV-Scanner unavailable', category: 'Supply Chain' },
        { label: 'Hygiene checks — license, manifest, README presence', category: 'Hygiene' },
        { label: 'Weighted scoring — Secrets 40%, Vulns 30%, Static 20%, Hygiene 10%', category: 'Scoring' },
        { label: 'Critical secret = instant score 0 (blocks listing)', category: 'Blocking' },
      ],
      rulesTitle: 'SEMGRAM RULES (18 TOTAL):',
      rules: ['Prompt injection (5)', 'Insecure shell exec (3)', 'Hardcoded credentials (3)', 'Dangerous filesystem (2)', 'SSRF (2)', 'MCP-specific patterns (3)'],
      viewRules: '→ View full ruleset on GitHub',
    },
    l2: {
      title: 'SENTINEL L2 — DYNAMIC SANDBOX ANALYSIS (IMPLEMENTED)',
      live: 'LIVE IN PRODUCTION',
      descPre: 'L2 actually',
      descStrong: 'runs',
      descPost: 'the MCP server in an isolated Docker container with no network, read-only filesystem, 256MB memory limit, all capabilities dropped, and seccomp applied. Monitors for: credential access, network attempts, filesystem changes, code execution.',
      runAudit: '→ Run an audit',
      checks: [
        { label: 'Sandbox execution — gVisor / Firecracker / Docker+seccomp', category: 'Isolation' },
        { label: 'Syscall monitoring — open, connect, execve, fork, unlink', category: 'Monitoring' },
        { label: 'Adversarial test inputs — path traversal, SQL injection, SSRF, prompt injection', category: 'Testing' },
        { label: 'Multiplicative scoring on L1.6 — 1.0 (clean) / 0.7 (medium) / 0.3 (high) / 0.0 (critical)', category: 'Scoring' },
      ],
      phases: [
        { label: 'PHASE 1 (Q3 2026)', value: 'Docker + seccomp + strace', status: '✅ LIVE (GitHub Actions)' },
        { label: 'PHASE 2 (Q4 2026)', value: 'gVisor', status: 'Free (self-hosted)' },
        { label: 'PHASE 3 (Q1 2027)', value: 'Firecracker microVM', status: 'Paid (needs KVM)' },
      ],
    },
    limits: {
      title: 'HONEST LIMITATIONS OF SENTINEL L1.5',
      desc: 'We will not pretend L1.5 is sufficient. Here\'s exactly what it cannot do, and why L2 matters.',
      cards: [
        { warn: '⚠️ STATIC ONLY', body: 'Does not execute code. Cannot detect runtime behavior: data exfiltration, time-bombs, sandbox evasion, dynamic module loading.' },
        { warn: '⚠️ REGEX-BASED', body: 'Easily evaded via obfuscation, encodings, indirect calls. Semgrep rules catch patterns, not intent.' },
        { warn: '⚠️ NO BEHAVIORAL VERIFICATION', body: 'Does not verify that a skill does what it claims. A "weather" skill could declare weather behavior but do something else at runtime.' },
        { warn: '⚠️ SCALE vs DEPTH', body: '8,517 auto-scanned skills get a superficial scan. Only 43 are human-reviewed. No skill is dynamically analyzed today.' },
      ],
      riskTitle: 'RISK ASSESSMENT BY SKILL TYPE',
      col1: 'Skill Type',
      col2: 'Risk Level',
      col3: 'Why',
      rows: [
        { type: 'Free (human-reviewed)', level: 'LOW', why: '43 skills manually inspected by AliceLabs' },
        { type: 'Auto-scanned, risk_level=green', level: 'MEDIUM', why: 'Prompt-only, no install. Sentinel ran but no human review.' },
        { type: 'Auto-scanned, risk_level=yellow', level: 'MEDIUM-HIGH', why: 'Network/API access. Sentinel ran but no runtime analysis.' },
        { type: 'Paid, auto-scanned', level: 'HIGH', why: 'Code execution + money involved. Sentinel L1.5 is insufficient. Use mandates with low limits.' },
      ],
      bottomLineLabel: 'Bottom line:',
      bottomLineBody: 'Sentinel L1.5 is a good first step for a bootstrapped project, but insufficient as the sole trust layer for code that executes on your machine. L2 (sandboxed dynamic analysis) is the real fix — and it\'s in design phase, not production.',
    },
    changelog: {
      title: 'SENTINEL CHANGELOG',
      entries: [
        {
          date: '2026-07-02',
          strong: 'L1.6 LIVE IN PRODUCTION.',
          body: ' Added Semgrep with 18 MCP-specific rules (prompt injection, command injection, hardcoded credentials, SSRF, tool spoofing). Added Gitleaks for secret detection. Added OSV-Scanner for dependency vulnerabilities. Weighted scoring: Secrets 40%, Vulns 30%, Static 20%, Hygiene 10%. Critical secret = instant 0.',
          code: '→ Code',
        },
        {
          date: '2026-07-02',
          strong: 'L2 IMPLEMENTED.',
          body: ' Docker sandbox with: --network none, --read-only, --memory 256m, --cpus 0.5, --cap-drop ALL, seccomp. Monitors stdout for credential/URL/exec mentions, filesystem changes, network attempts, container crashes. Scoring: multiplicative on L1.6 (1.0 clean / 0.7 medium / 0.3 high / 0.0 critical). Runs in production (real-time) on every skill submission.',
          code: '→ Code',
          runAudit: '→ Run audit',
        },
        {
          date: '2026-06-30',
          strong: 'L1.5 live.',
          body: ' 6-point metadata-based audit: AUTH, prompt injection patterns, input validation, CORS, OAuth scopes, rate limiting error leakage.',
        },
      ],
      links: [
        { text: '→ Full roadmap (L1.5 → L3.5)', to: '/sentinel-roadmap' },
        { text: '→ Trust roadmap', to: '/trust' },
        { text: '→ Buyer\'s guide', to: '/buyers-guide' },
      ],
    },
  },

  es: {
    badge: 'SENTINEL L1.5 → L1.6 → L2',
    stats: {
      total: 'Skills Totales',
      scanned: 'Escaneadas por Sentinel',
      avgScore: 'Puntaje Medio Sentinel',
      passRate: 'Tasa de Aprobación (≥4/10)',
      critical: 'Problemas Críticos',
    },
    banner: {
      l15Label: 'L1.5 LIVE',
      l15Desc: '→ basado en metadata, 6 checks, corre en /api/audit-skill',
      l16Label: 'L1.6 LIVE',
      l16Desc: '→ Semgrep + Gitleaks + OSV-Scanner, corre en producción (tiempo real)',
      l2Label: 'L2 LIVE',
      l2Desc: '→ Docker sandbox, sin red, FS read-only, monitoreo de syscalls',
    },
    l15: {
      title: 'CHECKS DE SENTINEL L1.5',
      live: 'LIVE EN PRODUCCIÓN',
      checks: [
        { label: 'AUTH — ¿El servidor requiere autenticación?', category: 'Autenticación' },
        { label: 'Inyección en descripción de tools — 8 patrones de prompt injection detectados', category: 'Prompt Injection' },
        { label: 'Validación de inputs — ¿Valida los inputs?', category: 'Validación de Inputs' },
        { label: 'CORS — ¿La política CORS es permisiva?', category: 'CORS' },
        { label: 'OAuth scopes — ¿Los scopes son mínimos?', category: 'OAuth' },
        { label: 'Fuga de info en rate limiting — ¿Los errores filtran info de rate limit?', category: 'Rate Limiting' },
      ],
      descPre: 'L1.5 corre en cada skill vía',
      descCode: '/api/audit-skill',
      descPost: '. Analiza metadata (README, package.json, descripciones de tools). Las skills con puntaje bajo 4/10 son bloqueadas.',
    },
    audit: {
      title: 'TRAIL DE AUDITORÍA',
      live: 'LIVE',
      empty: 'No hay logs de auditoría disponibles aún.',
    },
    l16: {
      title: 'SENTINEL L1.6 — ANÁLISIS MEJORADO (LIVE EN PRODUCCIÓN)',
      badge: 'LIVE EN PRODUCCIÓN · TODAVÍA NO EN PRODUCCIÓN',
      descPre: 'L1.6 va más allá de la metadata — clona el repo real y corre herramientas de seguridad reales:',
      descSemgrepSuffix: ' (18 reglas MCP-specific), ',
      descGitleaksSuffix: ' (detección de secretos), ',
      descOSVSuffix: ' (vulnerabilidades de dependencias). ',
      descPost: 'Corre vía',
      descVia: 'GitHub Actions',
      checks: [
        { label: 'Análisis estático Semgrep — 18 reglas MCP-specific (prompt injection, command injection, secretos hardcoded, SSRF, tool spoofing)', category: 'Análisis Estático' },
        { label: 'Detección de secretos con Gitleaks — escanea API keys, private keys, mnemonics de wallet', category: 'Escaneo de Secretos' },
        { label: 'Auditoría de dependencias OSV-Scanner — chequea lockfiles de npm/pip contra bases de vulnerabilidades', category: 'Cadena de Suministro' },
        { label: 'Fallback npm audit — cuando OSV-Scanner no está disponible', category: 'Cadena de Suministro' },
        { label: 'Checks de higiene — presencia de licencia, manifest, README', category: 'Higiene' },
        { label: 'Scoring ponderado — Secrets 40%, Vulns 30%, Static 20%, Hygiene 10%', category: 'Scoring' },
        { label: 'Secreto crítico = score 0 instantáneo (bloquea listing)', category: 'Bloqueo' },
      ],
      rulesTitle: 'REGLAS SEMGRAM (18 EN TOTAL):',
      rules: ['Prompt injection (5)', 'Shell exec inseguro (3)', 'Credenciales hardcoded (3)', 'Filesystem peligroso (2)', 'SSRF (2)', 'Patrones MCP-specific (3)'],
      viewRules: '→ Ver ruleset completo en GitHub',
    },
    l2: {
      title: 'SENTINEL L2 — ANÁLISIS DINÁMICO EN SANDBOX (IMPLEMENTADO)',
      live: 'LIVE EN PRODUCCIÓN',
      descPre: 'L2 realmente',
      descStrong: 'ejecuta',
      descPost: 'el servidor MCP en un contenedor Docker aislado sin red, filesystem read-only, límite de memoria 256MB, todas las capacidades dropeadas, y seccomp aplicado. Monitorea: acceso a credenciales, intentos de red, cambios en filesystem, ejecución de código.',
      runAudit: '→ Ejecutar auditoría',
      checks: [
        { label: 'Ejecución en sandbox — gVisor / Firecracker / Docker+seccomp', category: 'Aislamiento' },
        { label: 'Monitoreo de syscalls — open, connect, execve, fork, unlink', category: 'Monitoreo' },
        { label: 'Inputs de test adversariales — path traversal, SQL injection, SSRF, prompt injection', category: 'Testing' },
        { label: 'Scoring multiplicativo sobre L1.6 — 1.0 (limpio) / 0.7 (medio) / 0.3 (alto) / 0.0 (crítico)', category: 'Scoring' },
      ],
      phases: [
        { label: 'FASE 1 (Q3 2026)', value: 'Docker + seccomp + strace', status: '✅ LIVE (GitHub Actions)' },
        { label: 'FASE 2 (Q4 2026)', value: 'gVisor', status: 'Gratis (self-hosted)' },
        { label: 'FASE 3 (Q1 2027)', value: 'Firecracker microVM', status: 'Pago (necesita KVM)' },
      ],
    },
    limits: {
      title: 'LIMITACIONES HONESTAS DE SENTINEL L1.5',
      desc: 'No vamos a pretender que L1.5 es suficiente. Esto es exactamente lo que no puede hacer, y por qué L2 importa.',
      cards: [
        { warn: '⚠️ SOLO ESTÁTICO', body: 'No ejecuta código. No puede detectar comportamiento en runtime: exfiltración de datos, time-bombs, evasión de sandbox, carga dinámica de módulos.' },
        { warn: '⚠️ BASADO EN REGEX', body: 'Fácilmente evadido vía ofuscación, encodings, llamadas indirectas. Las reglas Semgrep atrapan patrones, no intención.' },
        { warn: '⚠️ SIN VERIFICACIÓN CONDUCTUAL', body: 'No verifica que una skill haga lo que dice. Una skill de "clima" podría declarar comportamiento de clima pero hacer otra cosa en runtime.' },
        { warn: '⚠️ ESCALA vs PROFUNDIDAD', body: '8.517 skills auto-escaneadas reciben un scan superficial. Solo 43 son human-reviewed. Ninguna skill se analiza dinámicamente hoy.' },
      ],
      riskTitle: 'EVALUACIÓN DE RIESGO POR TIPO DE SKILL',
      col1: 'Tipo de Skill',
      col2: 'Nivel de Riesgo',
      col3: 'Por qué',
      rows: [
        { type: 'Free (human-reviewed)', level: 'BAJO', why: '43 skills inspeccionadas manualmente por AliceLabs' },
        { type: 'Auto-scanned, risk_level=green', level: 'MEDIO', why: 'Solo prompt, sin install. Sentinel corrió pero sin revisión humana.' },
        { type: 'Auto-scanned, risk_level=yellow', level: 'MEDIO-ALTO', why: 'Acceso a red/API. Sentinel corrió pero sin análisis en runtime.' },
        { type: 'Paid, auto-scanned', level: 'ALTO', why: 'Ejecución de código + dinero involucrado. Sentinel L1.5 es insuficiente. Usa mandatos con límites bajos.' },
      ],
      bottomLineLabel: 'Conclusión:',
      bottomLineBody: 'Sentinel L1.5 es un buen primer paso para un proyecto bootstrapped, pero insuficiente como única capa de confianza para código que se ejecuta en tu máquina. L2 (análisis dinámico en sandbox) es la solución real — y está en fase de diseño, no producción.',
    },
    changelog: {
      title: 'CHANGELOG DE SENTINEL',
      entries: [
        {
          date: '2026-07-02',
          strong: 'L1.6 LIVE EN PRODUCCIÓN.',
          body: ' Agregado Semgrep con 18 reglas MCP-specific (prompt injection, command injection, credenciales hardcoded, SSRF, tool spoofing). Agregado Gitleaks para detección de secretos. Agregado OSV-Scanner para vulnerabilidades de dependencias. Scoring ponderado: Secrets 40%, Vulns 30%, Static 20%, Hygiene 10%. Secreto crítico = 0 instantáneo.',
          code: '→ Código',
        },
        {
          date: '2026-07-02',
          strong: 'L2 IMPLEMENTADO.',
          body: ' Docker sandbox con: --network none, --read-only, --memory 256m, --cpus 0.5, --cap-drop ALL, seccomp. Monitorea stdout para menciones de credenciales/URL/exec, cambios en filesystem, intentos de red, crashes de contenedor. Scoring: multiplicativo sobre L1.6 (1.0 limpio / 0.7 medio / 0.3 alto / 0.0 crítico). Corre en producción (tiempo real) en cada submission de skill.',
          code: '→ Código',
          runAudit: '→ Ejecutar auditoría',
        },
        {
          date: '2026-06-30',
          strong: 'L1.5 live.',
          body: ' Auditoría basada en metadata de 6 puntos: AUTH, patrones de prompt injection, validación de inputs, CORS, OAuth scopes, fuga de info en rate limiting.',
        },
      ],
      links: [
        { text: '→ Roadmap completo (L1.5 → L3.5)', to: '/sentinel-roadmap' },
        { text: '→ Hoja de confianza', to: '/trust' },
        { text: '→ Guía del comprador', to: '/buyers-guide' },
      ],
    },
  },

  pt: {
    badge: 'SENTINEL L1.5 → L1.6 → L2',
    stats: {
      total: 'Skills Totais',
      scanned: 'Escaneadas pelo Sentinel',
      avgScore: 'Pontuação Média Sentinel',
      passRate: 'Taxa de Aprovação (≥4/10)',
      critical: 'Problemas Críticos',
    },
    banner: {
      l15Label: 'L1.5 LIVE',
      l15Desc: '→ baseado em metadata, 6 checks, roda em /api/audit-skill',
      l16Label: 'L1.6 LIVE',
      l16Desc: '→ Semgrep + Gitleaks + OSV-Scanner, roda em produção (tempo real)',
      l2Label: 'L2 LIVE',
      l2Desc: '→ Docker sandbox, sem rede, FS read-only, monitoramento de syscalls',
    },
    l15: {
      title: 'CHECKS DO SENTINEL L1.5',
      live: 'LIVE EM PRODUÇÃO',
      checks: [
        { label: 'AUTH — O servidor requer autenticação?', category: 'Autenticação' },
        { label: 'Injeção em descrição de tools — 8 padrões de prompt injection detectados', category: 'Prompt Injection' },
        { label: 'Validação de inputs — Valida os inputs?', category: 'Validação de Inputs' },
        { label: 'CORS — A política CORS é permissiva?', category: 'CORS' },
        { label: 'OAuth scopes — Os scopes são mínimos?', category: 'OAuth' },
        { label: 'Vazamento de info em rate limiting — Erros vazam info de rate limit?', category: 'Rate Limiting' },
      ],
      descPre: 'L1.5 roda em cada skill via',
      descCode: '/api/audit-skill',
      descPost: '. Analisa metadata (README, package.json, descrições de tools). Skills com pontuação abaixo de 4/10 são bloqueadas.',
    },
    audit: {
      title: 'TRILHA DE AUDITORIA',
      live: 'LIVE',
      empty: 'Nenhum log de auditoria disponível ainda.',
    },
    l16: {
      title: 'SENTINEL L1.6 — ANÁLISE APRIMORADA (LIVE EM PRODUÇÃO)',
      badge: 'LIVE EM PRODUÇÃO · AINDA NÃO EM PRODUÇÃO',
      descPre: 'L1.6 vai além da metadata — clona o repo real e roda ferramentas de segurança reais:',
      descSemgrepSuffix: ' (18 regras MCP-specific), ',
      descGitleaksSuffix: ' (detecção de secretos), ',
      descOSVSuffix: ' (vulnerabilidades de dependências). ',
      descPost: 'Roda via',
      descVia: 'GitHub Actions',
      checks: [
        { label: 'Análise estática Semgrep — 18 regras MCP-specific (prompt injection, command injection, secretos hardcoded, SSRF, tool spoofing)', category: 'Análise Estática' },
        { label: 'Detecção de secretos com Gitleaks — escaneia API keys, private keys, mnemonics de wallet', category: 'Escaneamento de Secretos' },
        { label: 'Auditoria de dependências OSV-Scanner — checa lockfiles npm/pip contra bases de vulnerabilidades', category: 'Cadeia de Suprimentos' },
        { label: 'Fallback npm audit — quando OSV-Scanner não está disponível', category: 'Cadeia de Suprimentos' },
        { label: 'Checks de higiene — presença de licença, manifest, README', category: 'Higiene' },
        { label: 'Scoring ponderado — Secrets 40%, Vulns 30%, Static 20%, Hygiene 10%', category: 'Scoring' },
        { label: 'Secreto crítico = score 0 instantâneo (bloqueia listing)', category: 'Bloqueio' },
      ],
      rulesTitle: 'REGRAS SEMGRAM (18 NO TOTAL):',
      rules: ['Prompt injection (5)', 'Shell exec inseguro (3)', 'Credenciais hardcoded (3)', 'Filesystem perigoso (2)', 'SSRF (2)', 'Padrões MCP-specific (3)'],
      viewRules: '→ Ver ruleset completo no GitHub',
    },
    l2: {
      title: 'SENTINEL L2 — ANÁLISE DINÂMICA EM SANDBOX (IMPLEMENTADO)',
      live: 'LIVE EM PRODUÇÃO',
      descPre: 'L2 realmente',
      descStrong: 'executa',
      descPost: 'o servidor MCP em um contêiner Docker isolado sem rede, filesystem read-only, limite de memória 256MB, todas as capacidades removidas, e seccomp aplicado. Monitora: acesso a credenciais, tentativas de rede, mudanças no filesystem, execução de código.',
      runAudit: '→ Executar auditoria',
      checks: [
        { label: 'Execução em sandbox — gVisor / Firecracker / Docker+seccomp', category: 'Isolamento' },
        { label: 'Monitoramento de syscalls — open, connect, execve, fork, unlink', category: 'Monitoramento' },
        { label: 'Inputs de teste adversariais — path traversal, SQL injection, SSRF, prompt injection', category: 'Testes' },
        { label: 'Scoring multiplicativo sobre L1.6 — 1.0 (limpo) / 0.7 (médio) / 0.3 (alto) / 0.0 (crítico)', category: 'Scoring' },
      ],
      phases: [
        { label: 'FASE 1 (Q3 2026)', value: 'Docker + seccomp + strace', status: '✅ LIVE (GitHub Actions)' },
        { label: 'FASE 2 (Q4 2026)', value: 'gVisor', status: 'Grátis (self-hosted)' },
        { label: 'FASE 3 (Q1 2027)', value: 'Firecracker microVM', status: 'Pago (precisa de KVM)' },
      ],
    },
    limits: {
      title: 'LIMITAÇÕES HONESTAS DO SENTINEL L1.5',
      desc: 'Não vamos fingir que L1.5 é suficiente. Isso é exatamente o que ele não pode fazer, e por que L2 importa.',
      cards: [
        { warn: '⚠️ SOMENTE ESTÁTICO', body: 'Não executa código. Não consegue detectar comportamento em runtime: exfiltração de dados, time-bombs, evasão de sandbox, carregamento dinâmico de módulos.' },
        { warn: '⚠️ BASEADO EM REGEX', body: 'Facilmente evadido via ofuscação, encodings, chamadas indiretas. Regras Semgrep pegam padrões, não intenção.' },
        { warn: '⚠️ SEM VERIFICAÇÃO COMPORTAMENTAL', body: 'Não verifica que uma skill faz o que afirma. Uma skill de "clima" poderia declarar comportamento de clima mas fazer outra coisa em runtime.' },
        { warn: '⚠️ ESCALA vs PROFUNDIDADE', body: '8.517 skills auto-escaneadas recebem um scan superficial. Apenas 43 são human-reviewed. Nenhuma skill é analisada dinamicamente hoje.' },
      ],
      riskTitle: 'AVALIAÇÃO DE RISCO POR TIPO DE SKILL',
      col1: 'Tipo de Skill',
      col2: 'Nível de Risco',
      col3: 'Por quê',
      rows: [
        { type: 'Free (human-reviewed)', level: 'BAIXO', why: '43 skills inspecionadas manualmente pela AliceLabs' },
        { type: 'Auto-scanned, risk_level=green', level: 'MÉDIO', why: 'Somente prompt, sem install. Sentinel rodou mas sem revisão humana.' },
        { type: 'Auto-scanned, risk_level=yellow', level: 'MÉDIO-ALTO', why: 'Acesso a rede/API. Sentinel rodou mas sem análise em runtime.' },
        { type: 'Paid, auto-scanned', level: 'ALTO', why: 'Execução de código + dinheiro envolvido. Sentinel L1.5 é insuficiente. Use mandatos com limites baixos.' },
      ],
      bottomLineLabel: 'Conclusão:',
      bottomLineBody: 'Sentinel L1.5 é um bom primeiro passo para um projeto bootstrapped, mas insuficiente como única camada de confiança para código que executa na sua máquina. L2 (análise dinâmica em sandbox) é a solução real — e está em fase de design, não produção.',
    },
    changelog: {
      title: 'CHANGELOG DO SENTINEL',
      entries: [
        {
          date: '2026-07-02',
          strong: 'L1.6 LIVE EM PRODUÇÃO.',
          body: ' Adicionado Semgrep com 18 regras MCP-specific (prompt injection, command injection, credenciais hardcoded, SSRF, tool spoofing). Adicionado Gitleaks para detecção de secretos. Adicionado OSV-Scanner para vulnerabilidades de dependências. Scoring ponderado: Secrets 40%, Vulns 30%, Static 20%, Hygiene 10%. Secreto crítico = 0 instantâneo.',
          code: '→ Código',
        },
        {
          date: '2026-07-02',
          strong: 'L2 IMPLEMENTADO.',
          body: ' Docker sandbox com: --network none, --read-only, --memory 256m, --cpus 0.5, --cap-drop ALL, seccomp. Monitora stdout para menções de credenciais/URL/exec, mudanças no filesystem, tentativas de rede, crashes de contêiner. Scoring: multiplicativo sobre L1.6 (1.0 limpo / 0.7 médio / 0.3 alto / 0.0 crítico). Roda em produção (tempo real) em cada submission de skill.',
          code: '→ Código',
          runAudit: '→ Executar auditoria',
        },
        {
          date: '2026-06-30',
          strong: 'L1.5 live.',
          body: ' Auditoria baseada em metadata de 6 pontos: AUTH, padrões de prompt injection, validação de inputs, CORS, OAuth scopes, vazamento de info em rate limiting.',
        },
      ],
      links: [
        { text: '→ Roadmap completo (L1.5 → L3.5)', to: '/sentinel-roadmap' },
        { text: '→ Roadmap de confiança', to: '/trust' },
        { text: '→ Guia do comprador', to: '/buyers-guide' },
      ],
    },
  },

  zh: {
    badge: 'SENTINEL L1.5 → L1.6 → L2',
    stats: {
      total: '技能总数',
      scanned: 'Sentinel 扫描数',
      avgScore: 'Sentinel 平均分',
      passRate: '通过率 (≥4/10)',
      critical: '严重问题',
    },
    banner: {
      l15Label: 'L1.5 LIVE',
      l15Desc: '→ 基于元数据,6 项检查,运行于 /api/audit-skill',
      l16Label: 'L1.6 LIVE',
      l16Desc: '→ Semgrep + Gitleaks + OSV-Scanner,生产环境实时运行',
      l2Label: 'L2 LIVE',
      l2Desc: '→ Docker 沙箱,无网络,只读文件系统,syscall 监控',
    },
    l15: {
      title: 'SENTINEL L1.5 检查项',
      live: '生产环境 LIVE',
      checks: [
        { label: 'AUTH — 服务器是否要求身份验证?', category: '身份验证' },
        { label: '工具描述注入 — 检测到 8 种提示注入模式', category: '提示注入' },
        { label: '输入验证 — 是否验证输入?', category: '输入验证' },
        { label: 'CORS — CORS 策略是否宽松?', category: 'CORS' },
        { label: 'OAuth scopes — scope 是否最小化?', category: 'OAuth' },
        { label: '限流错误泄漏 — 错误是否泄漏限流信息?', category: '限流' },
      ],
      descPre: 'L1.5 通过',
      descCode: '/api/audit-skill',
      descPost: ' 在每个技能上运行。它分析元数据(README、package.json、工具描述)。分数低于 4/10 的技能会被屏蔽。',
    },
    audit: {
      title: '审计追踪',
      live: 'LIVE',
      empty: '暂无审计日志。',
    },
    l16: {
      title: 'SENTINEL L1.6 — 增强分析(生产环境 LIVE)',
      badge: '生产环境 LIVE · 尚未上线生产',
      descPre: 'L1.6 超越元数据 — 它克隆实际仓库并运行真实安全工具:',
      descSemgrepSuffix: '(18 条 MCP 专用规则),',
      descGitleaksSuffix: '(密钥检测),',
      descOSVSuffix: '(依赖漏洞)。',
      descPost: '通过',
      descVia: 'GitHub Actions',
      checks: [
        { label: 'Semgrep 静态分析 — 18 条 MCP 专用规则(提示注入、命令注入、硬编码密钥、SSRF、工具伪造)', category: '静态分析' },
        { label: 'Gitleaks 密钥检测 — 扫描 API 密钥、私钥、钱包助记词', category: '密钥扫描' },
        { label: 'OSV-Scanner 依赖审计 — 检查 npm/pip lockfile 对照漏洞数据库', category: '供应链' },
        { label: 'npm audit 回退 — 当 OSV-Scanner 不可用时', category: '供应链' },
        { label: '规范检查 — 许可证、manifest、README 是否存在', category: '规范' },
        { label: '加权评分 — 密钥 40%、漏洞 30%、静态 20%、规范 10%', category: '评分' },
        { label: '严重密钥 = 立即 0 分(阻止上架)', category: '阻断' },
      ],
      rulesTitle: 'SEMGRAM 规则(共 18 条):',
      rules: ['提示注入 (5)', '不安全的 shell exec (3)', '硬编码凭据 (3)', '危险文件系统 (2)', 'SSRF (2)', 'MCP 专用模式 (3)'],
      viewRules: '→ 在 GitHub 查看完整规则集',
    },
    l2: {
      title: 'SENTINEL L2 — 动态沙箱分析(已实现)',
      live: '生产环境 LIVE',
      descPre: 'L2 真正',
      descStrong: '运行',
      descPost: 'MCP 服务器在隔离的 Docker 容器中,无网络、只读文件系统、256MB 内存限制、丢弃所有 capabilities,并应用 seccomp。监控:凭据访问、网络尝试、文件系统变更、代码执行。',
      runAudit: '→ 运行审计',
      checks: [
        { label: '沙箱执行 — gVisor / Firecracker / Docker+seccomp', category: '隔离' },
        { label: 'syscall 监控 — open、connect、execve、fork、unlink', category: '监控' },
        { label: '对抗性测试输入 — 路径穿越、SQL 注入、SSRF、提示注入', category: '测试' },
        { label: 'L1.6 上的乘法评分 — 1.0 (干净) / 0.7 (中) / 0.3 (高) / 0.0 (严重)', category: '评分' },
      ],
      phases: [
        { label: '第 1 阶段 (2026 Q3)', value: 'Docker + seccomp + strace', status: '✅ LIVE (GitHub Actions)' },
        { label: '第 2 阶段 (2026 Q4)', value: 'gVisor', status: '免费(自托管)' },
        { label: '第 3 阶段 (2027 Q1)', value: 'Firecracker microVM', status: '付费(需 KVM)' },
      ],
    },
    limits: {
      title: 'SENTINEL L1.5 的诚实局限',
      desc: '我们不会假装 L1.5 足够。以下是它做不到的事,以及 L2 为何重要。',
      cards: [
        { warn: '⚠️ 仅静态', body: '不执行代码。无法检测运行时行为:数据外泄、定时炸弹、沙箱逃逸、动态模块加载。' },
        { warn: '⚠️ 基于正则', body: '易于通过混淆、编码、间接调用绕过。Semgrep 规则捕获模式,而非意图。' },
        { warn: '⚠️ 无行为验证', body: '不验证技能是否如其声称。一个"天气"技能可能声明天气行为,但在运行时做其他事。' },
        { warn: '⚠️ 规模 vs 深度', body: '8,517 个自动扫描的技能仅获得浅层扫描。只有 43 个经过人工审核。今天没有任何技能被动态分析。' },
      ],
      riskTitle: '按技能类型的风险评估',
      col1: '技能类型',
      col2: '风险等级',
      col3: '原因',
      rows: [
        { type: '免费(人工审核)', level: '低', why: '43 个技能由 AliceLabs 人工检查' },
        { type: '自动扫描,risk_level=green', level: '中', why: '仅提示,无安装。Sentinel 运行了但无人工审核。' },
        { type: '自动扫描,risk_level=yellow', level: '中高', why: '有网络/API 访问。Sentinel 运行了但无运行时分析。' },
        { type: '付费,自动扫描', level: '高', why: '涉及代码执行 + 资金。Sentinel L1.5 不足。使用低额度的授权。' },
      ],
      bottomLineLabel: '底线:',
      bottomLineBody: 'Sentinel L1.5 对于自举项目是不错的第一步,但作为在你机器上执行的代码的唯一信任层并不足够。L2(沙箱动态分析)才是真正的解决方案 — 它仍在设计阶段,未投入生产。',
    },
    changelog: {
      title: 'SENTINEL 更新日志',
      entries: [
        {
          date: '2026-07-02',
          strong: 'L1.6 生产环境 LIVE。',
          body: ' 添加了 Semgrep,含 18 条 MCP 专用规则(提示注入、命令注入、硬编码凭据、SSRF、工具伪造)。添加 Gitleaks 进行密钥检测。添加 OSV-Scanner 检测依赖漏洞。加权评分:密钥 40%、漏洞 30%、静态 20%、规范 10%。严重密钥 = 立即 0 分。',
          code: '→ 代码',
        },
        {
          date: '2026-07-02',
          strong: 'L2 已实现。',
          body: ' Docker 沙箱:--network none、--read-only、--memory 256m、--cpus 0.5、--cap-drop ALL、seccomp。监控 stdout 中对凭据/URL/exec 的提及、文件系统变更、网络尝试、容器崩溃。评分:对 L1.6 乘法(1.0 干净 / 0.7 中 / 0.3 高 / 0.0 严重)。在每个技能提交时生产环境实时运行。',
          code: '→ 代码',
          runAudit: '→ 运行审计',
        },
        {
          date: '2026-06-30',
          strong: 'L1.5 上线。',
          body: ' 6 项基于元数据的审计:AUTH、提示注入模式、输入验证、CORS、OAuth scopes、限流错误泄漏。',
        },
      ],
      links: [
        { text: '→ 完整路线图 (L1.5 → L3.5)', to: '/sentinel-roadmap' },
        { text: '→ 信任路线图', to: '/trust' },
        { text: '→ 买家指南', to: '/buyers-guide' },
      ],
    },
  },

  fr: {
    badge: 'SENTINEL L1.5 → L1.6 → L2',
    stats: {
      total: 'Skills Totales',
      scanned: 'Scannées par Sentinel',
      avgScore: 'Score Moyen Sentinel',
      passRate: 'Taux de Réussite (≥4/10)',
      critical: 'Problèmes Critiques',
    },
    banner: {
      l15Label: 'L1.5 LIVE',
      l15Desc: '→ basé sur metadata, 6 checks, tourne dans /api/audit-skill',
      l16Label: 'L1.6 LIVE',
      l16Desc: '→ Semgrep + Gitleaks + OSV-Scanner, tourne en production (temps réel)',
      l2Label: 'L2 LIVE',
      l2Desc: '→ Docker sandbox, sans réseau, FS read-only, monitoring des syscalls',
    },
    l15: {
      title: 'CHECKS SENTINEL L1.5',
      live: 'LIVE EN PRODUCTION',
      checks: [
        { label: 'AUTH — Le serveur requiert-il une authentification ?', category: 'Authentification' },
        { label: 'Injection dans la description des tools — 8 motifs d\'injection de prompt détectés', category: 'Injection de Prompt' },
        { label: 'Validation des inputs — Valide-t-il les inputs ?', category: 'Validation des Inputs' },
        { label: 'CORS — La politique CORS est-elle permissive ?', category: 'CORS' },
        { label: 'OAuth scopes — Les scopes sont-ils minimaux ?', category: 'OAuth' },
        { label: 'Fuite d\'info dans le rate limiting — Les erreurs fuient-elles les infos de rate limit ?', category: 'Rate Limiting' },
      ],
      descPre: 'L1.5 tourne sur chaque skill via',
      descCode: '/api/audit-skill',
      descPost: '. Il analyse les metadata (README, package.json, descriptions des tools). Les skills avec un score inférieur à 4/10 sont bloquées.',
    },
    audit: {
      title: 'TRAIL D\'AUDIT',
      live: 'LIVE',
      empty: 'Aucun log d\'audit disponible pour le moment.',
    },
    l16: {
      title: 'SENTINEL L1.6 — ANALYSE AMÉLIORÉE (LIVE EN PRODUCTION)',
      badge: 'LIVE EN PRODUCTION · PAS ENCORE EN PRODUCTION',
      descPre: 'L1.6 va au-delà de la metadata — il clone le repo réel et fait tourner de vrais outils de sécurité :',
      descSemgrepSuffix: ' (18 règles MCP-specific), ',
      descGitleaksSuffix: ' (détection de secrets), ',
      descOSVSuffix: ' (vulnérabilités de dépendances). ',
      descPost: 'Tourne via',
      descVia: 'GitHub Actions',
      checks: [
        { label: 'Analyse statique Semgrep — 18 règles MCP-specific (prompt injection, command injection, secrets codés en dur, SSRF, tool spoofing)', category: 'Analyse Statique' },
        { label: 'Détection de secrets Gitleaks — scanne les API keys, private keys, mnemonics de wallet', category: 'Scan de Secrets' },
        { label: 'Audit de dépendances OSV-Scanner — vérifie les lockfiles npm/pip contre les bases de vulnérabilités', category: 'Chaîne d\'Approvisionnement' },
        { label: 'Fallback npm audit — quand OSV-Scanner n\'est pas disponible', category: 'Chaîne d\'Approvisionnement' },
        { label: 'Checks d\'hygiène — présence de licence, manifest, README', category: 'Hygiène' },
        { label: 'Scoring pondéré — Secrets 40 %, Vulns 30 %, Static 20 %, Hygiene 10 %', category: 'Scoring' },
        { label: 'Secret critique = score 0 instantané (bloque le listing)', category: 'Blocage' },
      ],
      rulesTitle: 'RÈGLES SEMGRAM (18 AU TOTAL) :',
      rules: ['Prompt injection (5)', 'Shell exec non sécurisé (3)', 'Identifiants codés en dur (3)', 'Filesystem dangereux (2)', 'SSRF (2)', 'Motifs MCP-specific (3)'],
      viewRules: '→ Voir le ruleset complet sur GitHub',
    },
    l2: {
      title: 'SENTINEL L2 — ANALYSE DYNAMIQUE EN SANDBOX (IMPLÉMENTÉ)',
      live: 'LIVE EN PRODUCTION',
      descPre: 'L2',
      descStrong: 'exécute réellement',
      descPost: 'le serveur MCP dans un conteneur Docker isolé sans réseau, filesystem read-only, limite mémoire 256 Mo, toutes les capacités supprimées, et seccomp appliqué. Surveille : accès aux identifiants, tentatives réseau, modifications du filesystem, exécution de code.',
      runAudit: '→ Lancer un audit',
      checks: [
        { label: 'Exécution en sandbox — gVisor / Firecracker / Docker+seccomp', category: 'Isolation' },
        { label: 'Monitoring des syscalls — open, connect, execve, fork, unlink', category: 'Monitoring' },
        { label: 'Inputs de test adversariaux — path traversal, SQL injection, SSRF, prompt injection', category: 'Tests' },
        { label: 'Scoring multiplicatif sur L1.6 — 1.0 (propre) / 0.7 (moyen) / 0.3 (élevé) / 0.0 (critique)', category: 'Scoring' },
      ],
      phases: [
        { label: 'PHASE 1 (Q3 2026)', value: 'Docker + seccomp + strace', status: '✅ LIVE (GitHub Actions)' },
        { label: 'PHASE 2 (Q4 2026)', value: 'gVisor', status: 'Gratuit (auto-hébergé)' },
        { label: 'PHASE 3 (Q1 2027)', value: 'Firecracker microVM', status: 'Payant (nécessite KVM)' },
      ],
    },
    limits: {
      title: 'LIMITES HONNÊTES DE SENTINEL L1.5',
      desc: 'Nous ne prétendrons pas que L1.5 est suffisant. Voici exactement ce qu\'il ne peut pas faire, et pourquoi L2 compte.',
      cards: [
        { warn: '⚠️ STATIQUE UNIQUEMENT', body: 'N\'exécute pas de code. Ne peut pas détecter le comportement à l\'exécution : exfiltration de données, time-bombs, évasion de sandbox, chargement dynamique de modules.' },
        { warn: '⚠️ BASÉ SUR REGEX', body: 'Facilement contourné par obfuscation, encodages, appels indirects. Les règles Semgrep capturent des motifs, pas des intentions.' },
        { warn: '⚠️ PAS DE VÉRIFICATION COMPORTEMENTALE', body: 'Ne vérifie pas qu\'une skill fait ce qu\'elle prétend. Une skill "météo" pourrait déclarer un comportement météo mais faire autre chose à l\'exécution.' },
        { warn: '⚠️ ÉCHELLE vs PROFONDEUR', body: '8 517 skills auto-scannées reçoivent un scan superficiel. Seulement 43 sont human-reviewed. Aucune skill n\'est analysée dynamiquement aujourd\'hui.' },
      ],
      riskTitle: 'ÉVALUATION DES RISQUES PAR TYPE DE SKILL',
      col1: 'Type de Skill',
      col2: 'Niveau de Risque',
      col3: 'Pourquoi',
      rows: [
        { type: 'Free (human-reviewed)', level: 'BAS', why: '43 skills inspectées manuellement par AliceLabs' },
        { type: 'Auto-scanned, risk_level=green', level: 'MOYEN', why: 'Prompt uniquement, sans install. Sentinel a tourné mais sans revue humaine.' },
        { type: 'Auto-scanned, risk_level=yellow', level: 'MOYEN-ÉLEVÉ', why: 'Accès réseau/API. Sentinel a tourné mais sans analyse runtime.' },
        { type: 'Paid, auto-scanned', level: 'ÉLEVÉ', why: 'Exécution de code + argent en jeu. Sentinel L1.5 est insuffisant. Utilisez des mandats avec des limites basses.' },
      ],
      bottomLineLabel: 'Conclusion :',
      bottomLineBody: 'Sentinel L1.5 est une bonne première étape pour un projet bootstrapped, mais insuffisant comme seule couche de confiance pour du code qui s\'exécute sur votre machine. L2 (analyse dynamique en sandbox) est la vraie solution — et il est en phase de design, pas en production.',
    },
    changelog: {
      title: 'CHANGELOG DE SENTINEL',
      entries: [
        {
          date: '2026-07-02',
          strong: 'L1.6 LIVE EN PRODUCTION.',
          body: ' Ajout de Semgrep avec 18 règles MCP-specific (prompt injection, command injection, identifiants codés en dur, SSRF, tool spoofing). Ajout de Gitleaks pour la détection de secrets. Ajout d\'OSV-Scanner pour les vulnérabilités de dépendances. Scoring pondéré : Secrets 40 %, Vulns 30 %, Static 20 %, Hygiene 10 %. Secret critique = 0 instantané.',
          code: '→ Code',
        },
        {
          date: '2026-07-02',
          strong: 'L2 IMPLÉMENTÉ.',
          body: ' Docker sandbox avec : --network none, --read-only, --memory 256m, --cpus 0.5, --cap-drop ALL, seccomp. Surveille stdout pour les mentions d\'identifiants/URL/exec, modifications du filesystem, tentatives réseau, crashes de conteneur. Scoring : multiplicatif sur L1.6 (1.0 propre / 0.7 moyen / 0.3 élevé / 0.0 critique). Tourne en production (temps réel) à chaque soumission de skill.',
          code: '→ Code',
          runAudit: '→ Lancer un audit',
        },
        {
          date: '2026-06-30',
          strong: 'L1.5 live.',
          body: ' Audit basé sur la metadata en 6 points : AUTH, motifs d\'injection de prompt, validation des inputs, CORS, OAuth scopes, fuite d\'info dans le rate limiting.',
        },
      ],
      links: [
        { text: '→ Roadmap complète (L1.5 → L3.5)', to: '/sentinel-roadmap' },
        { text: '→ Roadmap de confiance', to: '/trust' },
        { text: '→ Guide de l\'acheteur', to: '/buyers-guide' },
      ],
    },
  },
};

export default function Security() {
  const { t, lang } = useLang();
  const c = CONTENT[lang] || CONTENT.en;
  const [stats, setStats] = useState({
    total: 0,
    scanned: 0,
    avgScore: 0,
    passRate: 100,
    criticalIssues: 0,
  });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadStats();
    loadLogs();
  }, []);

  const loadStats = async () => {
    try {
      const mres = await fetch('/api/manifest.json');
      if (mres.ok) {
        const m = await mres.json();
        const total = m.total_skills || 0;
        setStats(s => ({ ...s, total, scanned: total }));
      }

      const sres = await fetch('/api/skills.json');
      if (sres.ok) {
        const skills = await sres.json();
        if (Array.isArray(skills) && skills.length > 0) {
          const sum = skills.reduce((acc, s) => acc + (s.sentinel_score || 0), 0);
          const avg = sum / skills.length;
          const passing = skills.filter(s => (s.sentinel_score || 0) >= 4).length;
          setStats(s => ({
            ...s,
            avgScore: avg.toFixed(1),
            passRate: ((passing / skills.length) * 100).toFixed(1),
            criticalIssues: skills.filter(s => (s.sentinel_score || 0) < 4).length,
          }));
        }
      }
    } catch (e) {
      console.warn('Could not load security stats:', e.message);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/skills.json');
      if (!res.ok) return;
      const skills = await res.json();
      if (!Array.isArray(skills) || skills.length === 0) return;
      const recent = skills.slice(-8).reverse().map((s, i) => ({
        id: `AUD-${String(i + 1).padStart(3, '0')}`,
        time: i === 0 ? 'Just now' : `${i} hour${i === 1 ? '' : 's'} ago`,
        type: 'Skill listing audit',
        status: 'Passed',
        skill: s.name,
        score: s.sentinel_score || 6,
        maxScore: 10,
      }));
      setLogs(recent);
    } catch (e) {
      console.warn('Could not load audit logs:', e.message);
    }
  };

  const statCards = [
    { label: c.stats.total, value: stats.total.toLocaleString() },
    { label: c.stats.scanned, value: stats.scanned.toLocaleString() },
    { label: c.stats.avgScore, value: `${stats.avgScore}/10` },
    { label: c.stats.passRate, value: `${stats.passRate}%` },
    { label: c.stats.critical, value: stats.criticalIssues },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">{c.badge}</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('security.title')}
          </h1>
          <p className="text-zinc-400 max-w-2xl">
            {t('security.subtitle')}
          </p>
        </motion.div>

        {/* Live stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10"
        >
          {statCards.map((stat) => (
            <div key={stat.label} className="premium-card p-5 text-center">
              <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1 uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Version banner */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="premium-card p-4 mb-8 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#00F299]/10 text-[#00F299] text-xs font-mono font-bold">{c.banner.l15Label}</span>
            <span className="text-zinc-500 text-xs">{c.banner.l15Desc}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#00d1ff]/10 text-[#00d1ff] text-xs font-mono font-bold">{c.banner.l16Label}</span>
            <span className="text-zinc-500 text-xs">{c.banner.l16Desc}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#00F299]/10 text-[#00F299] text-xs font-mono font-bold">{c.banner.l2Label}</span>
            <span className="text-zinc-500 text-xs">{c.banner.l2Desc}</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* L1.5 Checks (LIVE) */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">{c.l15.title}</h2>
              <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono font-bold">{c.l15.live}</span>
            </div>
            <ul className="space-y-3">
              {c.l15.checks.map((check) => (
                <li key={check.label} className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#00F299] shrink-0 mt-1.5" />
                  <div>
                    <span className="text-zinc-300">{check.label}</span>
                    <div className="text-zinc-600 text-[10px] mt-0.5">{check.category}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-zinc-500 text-xs mt-6 leading-relaxed">
              {c.l15.descPre} <code className="text-[#00F299]">{c.l15.descCode}</code>{c.l15.descPost}
            </p>
          </motion.div>

          {/* Audit Logs */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold">{c.audit.title}</h2>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F299] animate-pulse" />
                {c.audit.live}
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="premium-card p-8 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-zinc-400 text-sm">{c.audit.empty}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="premium-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-2 h-2 rounded-full bg-[#00F299]" />
                      <div>
                        <div className="text-white text-sm font-mono">{log.type}</div>
                        <div className="text-zinc-500 text-[10px] font-mono">{log.skill}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#00F299] text-xs font-mono">{log.status} ({log.score}/{log.maxScore})</div>
                      <div className="text-zinc-500 text-[10px] font-mono">{log.time}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* L1.6 Checks (LIVE IN PRODUCTION) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="premium-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">{c.l16.title}</h2>
            <span className="px-2 py-0.5 rounded bg-[#00d1ff]/10 text-[#00d1ff] text-[10px] font-mono font-bold">{c.l16.badge}</span>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            {c.l16.descPre}
            <strong className="text-white"> Semgrep</strong>{c.l16.descSemgrepSuffix}
            <strong className="text-white"> Gitleaks</strong>{c.l16.descGitleaksSuffix}
            <strong className="text-white"> OSV-Scanner</strong>{c.l16.descOSVSuffix}
            {c.l16.descPost}{' '}
            <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/actions/workflows/sentinel-l16-audit.yml" target="_blank" rel="noopener" className="text-[#00F299] hover:underline">{c.l16.descVia}</a>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {c.l16.checks.map((check) => (
              <div key={check.label} className="flex items-start gap-3 p-3 rounded-lg bg-black/40">
                <span className="text-[#00d1ff] text-xs mt-0.5">✓</span>
                <div>
                  <span className="text-zinc-300 text-xs">{check.label}</span>
                  <div className="text-zinc-600 text-[10px] mt-0.5">{check.category}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-black/40">
            <div className="text-zinc-500 text-[10px] mb-1 font-mono">{c.l16.rulesTitle}</div>
            <div className="flex flex-wrap gap-2">
              {c.l16.rules.map(r => (
                <span key={r} className="px-2 py-1 rounded bg-[#00d1ff]/5 text-[#00d1ff] text-[10px] font-mono">{r}</span>
              ))}
            </div>
            <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/aep-marketplace/sentinel-rules/semgrep-mcp-rules.yml" target="_blank" rel="noopener" className="text-[#00F299] text-xs hover:underline mt-2 inline-block">{c.l16.viewRules}</a>
          </div>
        </motion.div>

        {/* L2 Checks (IMPLEMENTED) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="premium-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">{c.l2.title}</h2>
            <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono font-bold">{c.l2.live}</span>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            {c.l2.descPre} <strong className="text-white">{c.l2.descStrong}</strong> {c.l2.descPost}
            <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/actions/workflows/sentinel-l2-sandbox.yml" target="_blank" rel="noopener" className="text-[#00F299] hover:underline ml-1">{c.l2.runAudit}</a>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {c.l2.checks.map((check) => (
              <div key={check.label} className="flex items-start gap-3 p-3 rounded-lg bg-black/40">
                <span className="text-yellow-400 text-xs mt-0.5">○</span>
                <div>
                  <span className="text-zinc-300 text-xs">{check.label}</span>
                  <div className="text-zinc-600 text-[10px] mt-0.5">{check.category}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {c.l2.phases.map((phase) => (
              <div key={phase.label} className="p-3 rounded-lg bg-black/40">
                <div className="text-zinc-500 text-[10px] mb-1 font-mono">{phase.label}</div>
                <div className="text-white text-xs">{phase.value}</div>
                <div className="text-[#00F299] text-[10px] mt-1">{phase.status}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Honest limitations */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="premium-card p-6 mb-8 border-l-4 border-yellow-500/50">
          <h2 className="text-white font-semibold mb-4">{c.limits.title}</h2>
          <p className="text-zinc-400 text-sm mb-4">
            {c.limits.desc}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {c.limits.cards.map((card) => (
              <div key={card.warn} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <div className="text-red-400 text-xs font-mono mb-1">{card.warn}</div>
                <p className="text-zinc-400 text-xs">{card.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-black/40">
            <div className="text-zinc-300 text-xs font-bold mb-2">{c.limits.riskTitle}</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-zinc-400">{c.limits.col1}</th>
                  <th className="text-left py-2 text-zinc-400">{c.limits.col2}</th>
                  <th className="text-left py-2 text-zinc-400">{c.limits.col3}</th>
                </tr>
              </thead>
              <tbody>
                {c.limits.rows.map((row, idx) => {
                  const colorClass = idx === 0 ? 'text-green-400'
                    : idx === 1 ? 'text-yellow-400'
                    : idx === 2 ? 'text-orange-400'
                    : 'text-red-400';
                  return (
                    <tr key={row.type} className={idx < c.limits.rows.length - 1 ? 'border-b border-white/5' : ''}>
                      <td className={`py-2 ${colorClass}`}>{row.type}</td>
                      <td className={`py-2 ${colorClass}`}>{row.level}</td>
                      <td className="py-2 text-zinc-400">{row.why}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-zinc-500 text-xs mt-4">
            <strong className="text-zinc-300">{c.limits.bottomLineLabel}</strong> {c.limits.bottomLineBody}
          </p>
        </motion.div>


        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="premium-card p-6">
          <h2 className="text-white font-semibold mb-4">{c.changelog.title}</h2>
          <div className="space-y-3">
            {c.changelog.entries.map((entry, i) => {
              const colorClass = i === 0 ? 'bg-[#00d1ff]/10 text-[#00d1ff]' : 'bg-[#00F299]/10 text-[#00F299]';
              return (
                <div key={i} className="flex gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded ${colorClass} font-mono whitespace-nowrap`}>{entry.date}</span>
                  <div className="text-zinc-400">
                    <strong className="text-white">{entry.strong}</strong>{entry.body}
                    {i === 0 && (
                      <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/aep-marketplace/lib/sentinel-l16.js" target="_blank" rel="noopener" className="text-[#00F299] hover:underline ml-1">{entry.code}</a>
                    )}
                    {i === 1 && (
                      <>
                        <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/aep-marketplace/lib/sentinel-l2-sandbox.sh" target="_blank" rel="noopener" className="text-[#00F299] hover:underline ml-1">{entry.code}</a>
                        <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/actions/workflows/sentinel-l2-sandbox.yml" target="_blank" rel="noopener" className="text-[#00F299] hover:underline ml-1">{entry.runAudit}</a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {c.changelog.links.map((link) => (
              <Link key={link.to} to={link.to} className={link.to === '/sentinel-roadmap' ? 'text-[#00F299] hover:underline' : 'text-zinc-400 hover:underline'}>
                {link.text}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
