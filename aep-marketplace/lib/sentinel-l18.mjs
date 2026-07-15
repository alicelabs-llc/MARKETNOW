/**
 * ⚠️ SENTINEL PROPRIETARY — Copyright (c) 2026 AliceLabs LLC. All Rights Reserved.
 *
 * MarketNow — Sentinel L1.8 YARA-equivalent Malware Family Detection
 * ==================================================================
 *
 * L1.7 catches generic patterns (launchers, bytecode, download badges).
 * L1.8 catches SPECIFIC malware families by signature — like YARA rules
 * but implemented in JS regex for the runtime audit path.
 *
 * Signatures sourced from:
 *   - MalwareBazaar (abuse.ch) — sample analysis
 *   - YARA-Rules community repo
 *   - AlienVault OTX pulses
 *   - Incident response from issue #9 (Trojan:Win64/Lazy.PGPK!MTB)
 *
 * Each rule has:
 *   - id: stable identifier (MLF-XXX)
 *   - family: malware family name (Emotet, Lazy, CobaltStrike, etc.)
 *   - pattern: regex matching unique bytecode/string signature
 *   - severity: critical (instant quarantine) | high (likely quarantine)
 *   - mitre: MITRE ATT&CK technique ID
 *   - source: where the signature came from
 *
 * Runs on:
 *   - Skill metadata (always)
 *   - Skill package contents (when packageBuffer provided)
 *   - Real-time /api/audit-skill?deep=1
 */

// ─── Malware family signatures ──────────────────────────────────────────

const MALWARE_FAMILIES = [
  {
    id: 'MLF-LAZY-001',
    family: 'Win64/Lazy.PGPK',
    severity: 'critical',
    mitre: 'T1027.002',
    pattern: /unit\.exe\s+package\.txt|Application\.cmd.*start\s+unit\.exe/i,
    description: 'Trojan:Win64/Lazy.PGPK!MTB — staged launcher using Application.cmd → unit.exe + package.txt (obfuscated Lua bytecode). This is the exact signature from the prospector-email-finder incident (issue #9, July 2026).',
    source: 'incident #9 response',
  },
  {
    id: 'MLF-EMOTET-001',
    family: 'Emotet',
    severity: 'critical',
    mitre: 'T1027.011',
    pattern: /Emotet|Geodo|Heodo/i,
    description: 'Emotet banking trojan — often delivered via malicious Office macros. Strings "Emotet", "Geodo", or "Heodo" appear in payloads.',
    source: 'MalwareBazaar signatures',
  },
  {
    id: 'MLF-COBALT-001',
    family: 'Cobalt Strike Beacon',
    severity: 'critical',
    mitre: 'T1071.001',
    pattern: /cobaltstrike|cobalt\s*strike|beacon\.dll|Metasploit/i,
    description: 'Cobalt Strike beacon — common in post-exploitation. Often used by ransomware operators.',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-MIMIKATZ-001',
    family: 'Mimikatz',
    severity: 'critical',
    mitre: 'T1003.001',
    pattern: /mimikatz|sekurlsa::logonpasswords|lsadump::sam|gentilkiwi/i,
    description: 'Mimikatz credential dumper — extracts Windows credentials from LSASS. Often packaged in malicious "MCP admin tools".',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-QAKBOT-001',
    family: 'QakBot',
    severity: 'critical',
    mitre: 'T1027',
    pattern: /QakBot|QBot|Pinkslipbot/i,
    description: 'QakBot banking trojan — often distributed via hijacked email threads.',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-TRICKBOT-001',
    family: 'TrickBot',
    severity: 'critical',
    mitre: 'T1027',
    pattern: /TrickBot|TrickLoader/i,
    description: 'TrickBot modular trojan — precursor to Ryuk/Conti ransomware.',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-AGENTTESLA-001',
    family: 'Agent Tesla',
    severity: 'critical',
    mitre: 'T1056.001',
    pattern: /Agent\s*Tesla|agtls/i,
    description: 'Agent Tesla keylogger — popular in phishing campaigns targeting businesses.',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-REDLINE-001',
    family: 'RedLine Stealer',
    severity: 'critical',
    mitre: 'T1555',
    pattern: /RedLine\s*Stealer|RedLine\s*Info/i,
    description: 'RedLine Stealer — extracts browser credentials, crypto wallets, FTP clients.',
    source: 'MalwareBazaar',
  },
  {
    id: 'MLF-VIDAR-001',
    family: 'Vidar Stealer',
    severity: 'critical',
    mitre: 'T1555',
    pattern: /Vidar\s*Stealer/i,
    description: 'Vidar Stealer — fork of HyperStealer, targets browsers and crypto wallets.',
    source: 'MalwareBazaar',
  },
  {
    id: 'MLF-RACCOON-001',
    family: 'Raccoon Stealer',
    severity: 'critical',
    mitre: 'T1555',
    pattern: /Raccoon\s*Stealer|Rac[oó]on\s*Stealer/i,
    description: 'Raccoon Stealer — MaaS (malware-as-a-service) targeting browsers and crypto.',
    source: 'MalwareBazaar',
  },
  {
    id: 'MLF-LUMMA-001',
    family: 'LummaC2 Stealer',
    severity: 'critical',
    mitre: 'T1555',
    pattern: /LummaC2|Lumma\s*Stealer/i,
    description: 'LummaC2 Stealer — sold on Telegram, targets browser data and crypto wallets.',
    source: 'MalwareBazaar',
  },
  {
    id: 'MLF-ASYNC-001',
    family: 'AsyncRAT',
    severity: 'critical',
    mitre: 'T1071.001',
    pattern: /AsyncRAT|Async\s*RAT/i,
    description: 'AsyncRAT — open-source RAT often abused by criminals for remote access.',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-NJCAT-001',
    family: 'njRAT',
    severity: 'critical',
    mitre: 'T1071.001',
    pattern: /njRAT|Bladabindi/i,
    description: 'njRAT (Bladabindi) — popular .NET RAT used for surveillance and credential theft.',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-REMCOS-001',
    family: 'Remcos RAT',
    severity: 'critical',
    mitre: 'T1071.001',
    pattern: /Remcos\s*RAT|Remcos\s*Pro/i,
    description: 'Remcos RAT — commercial RAT often cracked and redistributed for malicious use.',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-SOLARMARKET-001',
    family: 'SolarMarker/Jupiter',
    severity: 'high',
    mitre: 'T1027',
    pattern: /SolarMarker|Jupiter\s*Stealer/i,
    description: 'SolarMarker (Jupiter) — backdoor masquerading as PDF/Office docs in SEO-poisoned search results.',
    source: 'MalwareBazaar',
  },
  {
    id: 'MLF-LOKIBOT-001',
    family: 'Lokibot',
    severity: 'critical',
    mitre: 'T1555',
    pattern: /Lokibot|Loki\s*Bot/i,
    description: 'Lokibot — credential stealer targeting browsers, FTP, crypto wallets.',
    source: 'YARA-Rules community',
  },
  {
    id: 'MLF-IPHIOS-001',
    family: 'IPHost DoS',
    severity: 'high',
    mitre: 'T1499',
    pattern: /hping3|slowloris|goldeneye|rudy\s*--/,
    description: 'DoS tools — hping3, slowloris, goldeneye, RUDY. Often bundled in "stress test" MCP servers.',
    source: 'incident response',
  },
];

// ─── Run L1.8 ───────────────────────────────────────────────────────────

/**
 * Run L1.8 malware family detection.
 * @param {Object} skill - skill metadata
 * @param {Object} [options]
 * @param {string} [options.packageText] - if provided, scan this text (e.g. README/package.json contents)
 * @returns {Object} { findings, score_adjustment, quarantine_recommended, details }
 */
export function runL18(skill, options = {}) {
  const { packageText } = options;
  const findings = {
    matched_families: [],
    total_critical: 0,
    total_high: 0,
  };

  // Scan metadata
  const metadataText = [
    skill.name || '',
    skill.description || '',
    skill.doc?.system_prompt || '',
    skill.doc?.setup || '',
    skill.install || '',
    skill.author || '',
    skill.source?.note || '',
  ].join('\n');

  const allText = packageText ? `${metadataText}\n${packageText}` : metadataText;

  for (const rule of MALWARE_FAMILIES) {
    if (rule.pattern.test(allText)) {
      findings.matched_families.push({
        id: rule.id,
        family: rule.family,
        severity: rule.severity,
        mitre: rule.mitre,
        description: rule.description,
        source: rule.source,
      });
      if (rule.severity === 'critical') findings.total_critical++;
      else if (rule.severity === 'high') findings.total_high++;
    }
  }

  // Score adjustment
  let scoreAdjustment = 0;
  if (findings.total_critical > 0) {
    scoreAdjustment = -10;
  } else {
    scoreAdjustment -= findings.total_high * 5;
  }
  scoreAdjustment = Math.max(-10, scoreAdjustment);

  const quarantineRecommended = findings.total_critical > 0 || findings.total_high >= 1;

  return {
    findings,
    score_adjustment: scoreAdjustment,
    quarantine_recommended: quarantineRecommended,
    details: {
      malware_family_rules_run: MALWARE_FAMILIES.length,
      matched_families: findings.matched_families.length,
    },
  };
}

export { MALWARE_FAMILIES };
