---
name: autonomous-quality-assurance
description: Self-testing framework for AI agent outputs. Use when agents need to verify their own work for correctness, consistency, hallucinations, formatting errors, or policy compliance before delivering results. Prevents costly mistakes and builds user trust through automated quality gates.
---

# Autonomous Quality Assurance - Self-Verifying Agent Outputs

## Overview

Autonomous QA enables AI agents to self-test, self-correct, and self-validate their outputs before presenting them to users. Implements multi-layer quality gates: structural validation, semantic consistency, hallucination detection, factual verification, style/policy compliance, and cross-reference checking. Each output gets a QA score; outputs below threshold are automatically fixed and re-validated.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Agents output hallucinated facts | Multi-source factual verification |
| Code/output has silent errors | Automated unit tests on output |
| Formatting inconsistent with brand | Style guide compliance checker |
| User has to manually review every output | Confidence score shows reliability |
| No accountability for agent errors | QA audit trail + auto-correction |
| Agents contradict themselves | Cross-reference consistency check |

## Quality Gate Pipeline

```
Agent Output
    │
    ▼
┌──────────────────┐
│ Gate 1: Structure │  ← Valid format, required fields, no syntax errors
└──────┬───────────┘
       ▼
┌──────────────────────┐
│ Gate 2: Hallucination │  ← Factual accuracy, source verification
│     Detection         │
└──────┬───────────────┘
       ▼
┌────────────────────┐
│ Gate 3: Consistency  │  ← Internal logic, no contradictions
└──────┬─────────────┘
       ▼
┌──────────────────────┐
│ Gate 4: Style/Policy  │  ← Brand voice, content policy, safety
└──────┬───────────────┘
       ▼
┌───────────────────┐
│ Gate 5: UX Review  │  ← Readability, actionability, tone
└───────┬───────────┘
        │
   ┌────┴────┐
   │  PASS   │  → Deliver to user
   │  FAIL   │  → Auto-fix queue
   │  WARN   │  → Deliver + flag for review
   └─────────┘
```

## Detection Methods

### 1. Hallucination Detection

| Method | Description | When |
|--------|-------------|------|
| **Source Citation** | Output claims must cite sources | Always |
| **Cross-Model Verification** | Same prompt → different model → compare | For factual claims |
| **Known Fact Database** | Check against verified knowledge base | Domain-specific |
| **Numerical Consistency** | Math/statistics re-calculated | Data-heavy outputs |
| **Entity Validation** | Check names, dates, places exist | Reference outputs |

```markdown
QA Command:
`qa detect-hallucinations output.md --sources reference1.md,reference2.md`
`qa fact-check "US GDP grew 5.2% in 2025" --confidence 0.95`

Output:
✗ HIGH RISK: "5.2%" — Actual: 4.8% (source: Bureau of Economic Analysis)
→ Auto-corrected to 4.8%
```

### 2. Structural Validation

Checks output against expected schema:

```markdown
For code outputs:
`qa validate-structure script.py --type python`

For documents:
`qa validate-structure report.md --template corporate-report`

For data:
`qa validate-structure data.csv --schema columns:name,email,phone`

Checks:
- Format validity (JSON valid? CSV parsable? Python compiles?)
- Required fields present
- No placeholder text ("[TODO]", "lorem ipsum")
- Expected sections present (TOC, headings, etc.)
```

### 3. Consistency Checking

```markdown
`qa check-consistency document.md`

Detects:
- Number contradictions: "5 steps" but lists 7
- Position contradictions: "Democrats won in 2020" / "Republicans won in 2020"
- Timeline errors: "Founded in 1999" vs "20-year anniversary in 2025"
- Person/entity identity shifts
- Argument structure: Claim → Evidence mismatch
```

### 4. Style & Policy Compliance

```markdown
`qa check-style content.md --brand-brand-guidelines.json`

Checks:
- Vocabulary: Jargon, banned words, preferred terms
- Tone: Matches target (professional ↔ casual ↔ urgent)
- Formatting: Headers, lists, bold usage, emoji density
- Inclusivity: Gender-neutral language, accessibility
- Legal: No unlicensed claims, proper disclaimers

`qa check-policy content.md --policies content-policy.yaml`

Policy violations flagged:
- Hate speech / harmful content
- Copyright or trademark issues
- Misinformation markers
- PII exposure (emails, phones, SSNs)
```

## QA Score System

```markdown
QA SCORE: 87/100 ── PASS
  ├─ Structure:      95/100 ●
  ├─ Facts:          82/100 ● (2 citations auto-corrected)
  ├─ Consistency:    90/100 ●
  ├─ Style:          80/100 ● (tone slightly formal for target)
  └─ Actionability:  85/100 ●

Thresholds:
  PASS: 80+ → Deliver to user
  WARN: 60-79 → Deliver with QA note
  FAIL: <60 → Block, route to auto-fix
```

## Auto-Fix Queue

When an output fails a gate, the agent automatically enters fix mode:

```markdown
qa fix --issue "hallucination:gdp_figure" --output output.md

Fix strategies:
1. Hallucination → Re-write from verified sources
2. Structure → Re-format to match template
3. Consistency → Reconcile contradictions (pick most recent/authoritative)
4. Style → Re-write with correct tone/vocabulary
5. Missing info → Request clarification from user

Each fix cycles back through the QA pipeline (max 3 fix iterations
before escalating to user review).
```

## Audit Trail

```markdown
Every output generates a QA manifest:

qa manifest output.md

Output:
{
  "output_id": "out_abc123",
  "timestamp": "2026-03-04T17:30:00Z",
  "agent_id": "agent_main_v1",
  "gates_passed": ["structure", "hallucination", "consistency"],
  "gates_warned": ["style"],
  "hallucinations_fixed": 2,
  "auto_fixes": 1,
  "qa_score": 87,
  "verdict": "PASS",
  "human_review": false
}
```

## Scripts

### scripts/qa_engine.py
Main QA engine with:
- `validate` - Run full QA pipeline
- `detect-hallucinations` - Factual accuracy check
- `check-style` - Brand/style compliance
- `check-consistency` - Internal logic check
- `fix` - Auto-correct detected issues
- `score` - Generate QA score
- `manifest` - Generate QA audit trail

### scripts/qa_config.py
Configuration loader:
- Custom QA rules per domain
- Style guide definitions
- Fact database management
- Fix strategy definitions
- Threshold configuration

## References

### references/qa_rules.yaml
Default QA rules for common output types (code, documents, data, creative, analysis) with thresholds, fix strategies, and gate configurations.

### references/style_guides.yaml
Style profiles for professional, casual, academic, marketing, technical tones with vocabulary rules and formatting requirements.

---

**Single command:** `qa validate output.md --type document`
**Auto mode:** `qa watch` (continuously validates all outputs)
**Report:** `qa report --since 24h`
