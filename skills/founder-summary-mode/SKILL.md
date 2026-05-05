---
name: founder-summary-mode
description: |
  Generate a terse "what to build / what to avoid / how to position" brief.
  Distills research into actionable founder-level insights.
triggers:
  - "founder summary for"
  - "executive brief"
  - "what to build"
  - "founder insights"
critical_rules:
  - Must cite specific user quotes for each claim
  - Avoid vague generalizations
  - Prioritize by frequency + intensity + corroboration
  - Include positioning language from user mouths
output:
  - $OUTPUT_DIR/founder_summary.md — 1-page actionable brief
  - $OUTPUT_DIR/founder_actions.csv — prioritized action items
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# Founder Summary Mode

Distills Reddit research into a terse, actionable brief for founders: what to build, what to avoid, and how to position.

## Structure

### 1. What to Build (Opportunities)
Top 3-5 validated opportunities with user demand evidence
- Specific feature gaps with corroboration
- Quantified demand (mentions, upvotes, personas)
- User quote evidence

### 2. What to Avoid (Traps)
Critical mistakes users warn about
- Features that backfire
- Pricing missteps
- UX anti-patterns
- Positioning failures

### 3. How to Position (Messaging)
Direct quotes to use in messaging
- Pain statements to own
- Competitive differentiators users cite
- Language that resonates

### 4. Competitive Landscape
Who users switch to/from and why
- Net migration patterns
- Your sustainable advantages
- Vulnerabilities to address

## Pipeline

1. **Aggregate findings** — combine persona, sentiment, quality, feature data
2. **Score opportunities** — frequency × intensity × corroboration
3. **Identify patterns** — most-mentioned, highest-intensity validated needs
4. **Extract positioning** — user language for messaging
5. **Prioritize** — rank by impact and feasibility
6. **Generate brief** — 1-page founder-ready summary

## Usage

```bash
# Generate founder summary from completed research
node scripts/founder-summary.mjs $OUTPUT_DIR --format brief

# Or run as final step in pipeline
./run-research.sh {topic} --founder-brief
```

## Output Format

```markdown
# Founder Brief — {TOPIC}
**Research Date**: {date} | **Total Posts**: {count} | **Key Subreddits**: {list}

---

## What to Build

### 1. {Opportunity Name}  [Priority: P0]
**The Gap**: {concise description}

**Evidence**:
- {N}+ independent mentions across {X} subreddits
- Sentiment: {frustration/praise/confusion} (avg intensity {score}/5)
- Personas affected: {list}

**User Quote**:
> "{Exact quote}"  
> — {persona}, r/{subreddit} ({upvotes}↑)

**Positioning**: {How to message this}

### 2. {Second Opportunity}  [Priority: P1]
...

---

## What to Avoid

### 1. {Anti-Pattern}  [Severity: High]
**The Problem**: {What users hate}

**Evidence**:
- {N}+ churn signals
- {N}+ explicit warnings to others

**User Quote**:
> "{Exact quote}"  
> — {persona}, r/{subreddit}

**Fix**: {What to do instead}

### 2. {Second Anti-Pattern}  [Severity: Medium]
...

---

## How to Position

### Core Problem Statement (Use This)
> "{User quote stating the problem}"

**Positioning Angle**: {Based on user language}

### Competitive Advantage (Users Say)
> "{User quote comparing you favorably}"

**Key Differentiator**: {What to emphasize}

### Messaging Don'ts (Users Reject)
- "{Language users call out as BS}" — triggers skepticism
- "{Competitor claim users dispute}" — creates distrust

---

## Competitive Landscape

### Switches TO (Threat)
- **{Competitor A}**: {N}+ switches, reason: {quote}
- **{Competitor B}**: {N}+ switches, reason: {quote}

### Switches FROM (Opportunity)  
- **{Competitor C}**: {N}+ switches to your category, reason: {quote}
- **{Competitor D}**: {N}+ considering switch, friction: {quote}

### Your Sustainable Advantage
> "{User quote citing your lasting benefit}"

### Vulnerability to Address
> "{User quote about what could make them leave}"

---

## Action Items (90 Days)

| Priority | Action | Evidence | Owner | Timeline |
|----------|--------|----------|-------|----------|
| P0 | {Specific feature} | {N}+ mentions, {sentiment} | {role} | {date} |
| P1 | {Fix anti-pattern} | {N}+ churn signals | {role} | {date} |
| P2 | {Messaging test} | {quote evidence} | {role} | {date} |

---

## Traction Channels

**Where users congregate**: {subreddit list}
**Language that converts**: {quoted phrases}
**Objections to overcome**: {quoted concerns}
**Success stories to amplify**: {user wins quoted}
```

## CSV Action Items

```csv
priority,action,category,evidence_count,evidence_quotes,personas,owner,timeline
P0,Build offline mode,MISSING_FEATURE,12,"quotes...",engineer;founder,engineering,2024-04-01
P1,Fix pricing page,PRICING,8,"quotes...",founder;small_biz,marketing,2024-03-15
P2,Add API docs,DOCUMENTATION,6,"quotes...",engineer,devrel,2024-04-15
```

## Key Metrics

- Opportunities identified (P0/P1/P2)
- Critical anti-patterns to avoid
- Competitive vulnerabilities
- Proven messaging phrases (with sources)
- Actionable next steps (with evidence scores)
