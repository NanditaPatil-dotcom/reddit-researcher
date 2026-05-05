---
name: competitor-matrix
description: |
  Extracts "switched from/to" mentions into a comparison table.
  Identifies competitor weaknesses and strengths based on user migration patterns.
triggers:
  - "competitor matrix for"
  - "switched from"
  - "migration patterns"
  - "competitor comparison"
critical_rules:
  - Every switch mention must include exact quote and source URL
  - Table must distinguish switches TO (threats) and switches FROM (opportunities)
  - Never aggregate or summarize without direct quotes
output:
  - $OUTPUT_DIR/competitor_matrix.md — migration table with quotes
  - $OUTPUT_DIR/competitor_switches.csv — structured switch data
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# Competitor Matrix

Extracts "switched from/to" mentions to build a migration matrix showing which tools users are leaving and which they're adopting.

## What It Looks For

- **Switches TO (threats)**: "switched to X", "moved to X", "now using X", "using X instead"
- **Switches FROM (opportunities)**: "switched from X", "moved away from X", "left X", "was using X but"
- **Comparison mentions**: "X does this better", "unlike X", "compared to X"
- **Reasons for switching**: "because", "since", "the problem with X was"

## Pipeline

1. **Keyword targeted search** — specifically for "switched", "moved", "compared to"
2. **Extract context** — full comment thread around switch mentions
3. **Build matrix** — tools as rows/columns, count of mentions with quotes
4. **Categorize by theme** — price, features, UX, reliability for each switch
5. **Output table** — markdown matrix and CSV for analysis

## Usage

```bash
# Search specifically for switch mentions
bb search "switched from {TOPIC} to" --num-results 20
bb search "switched to {TOPIC} from" --num-results 20
bb search "{TOPIC} vs" --num-results 20
```

## Output Format

```markdown
## Competitor Migration Matrix — {TOPIC}

### Switches TO (Competitors gaining users)

| From {TOPIC} | To Tool | Count | Key Quote |
|-------------|---------|-------|----------|
| {TOPIC} | Notion | 12 | "Switched to Notion because the mobile app actually works" |
| {TOPIC} | Airtable | 8 | "Moved to Airtable for better database features" |

### Switches FROM (Opportunities to gain users)

| From Tool | To {TOPIC} | Count | Key Quote |
|-----------|-----------|-------|----------|
| Asana | {TOPIC} | 15 | "Left Asana because {TOPIC} is simpler" |
| Trello | {TOPIC} | 9 | "Switched from Trello, needed more structure" |

### Common Switch Reasons
- **Price**: "{TOPIC} is half the cost of X"
- **Features**: "X was missing {feature} that {TOPIC} has"
- **UX**: "{TOPIC} is just easier to use than X"
```

## Key Metrics

- Total mentions per competitor (TO/FROM)
- Net migration score (FROM - TO)
- Most common reasons for each switch
- Subreddits with highest switch discussion density
