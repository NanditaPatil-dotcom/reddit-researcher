---
name: churn-signal-extraction
description: |
  Extracts quotes indicating churn: "I cancelled", "I switched", "dealbreaker", "not worth it", 
  "too expensive", "can't justify", "waste of money". Identifies users who left or are about to leave.
triggers:
  - "churn signals from"
  - "find cancellations"
  - "extract churn reasons"
  - "who left"
critical_rules:
  - Every quote must be verbatim from a Reddit post/comment
  - Every quote must include the source URL
  - Never paraphrase or invent quotes
output:
  - $OUTPUT_DIR/churn_signals.md — list of churn quotes with sources
  - CSV with churn signal counts by theme
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# Churn Signal Extraction

Extracts direct quotes from Reddit indicating users are cancelling, have switched away, or are at risk of churn.

## What It Looks For

- **Explicit cancellations**: "I cancelled", "I unsubscribed", "I left"
- **Switches**: "switched to", "moved to", "migrated to" (away from the topic)
- **Dealbreakers**: "dealbreaker", "game over", "hard pass"
- **Value complaints**: "not worth it", "too expensive", "can't justify", "waste of money"
- **Frustration leading to exit**: "gave up", "done with", "never again"

## Pipeline

1. **Extract posts** using the core reddit-researcher pipeline
2. **Scan for churn keywords** in comments and posts
3. **Flag high-signal churn quotes** with full context
4. **Categorize by reason**: price, features, UX, reliability, competitor switch
5. **Output structured report** with exact quotes and Reddit URLs

## Usage

```bash
# Run as part of the main pipeline or standalone
browse open "https://www.reddit.com/r/{SUBREDDIT}/search/?q={TOPIC}+cancelled&sort=new"
browse get text "body"
```

## Output Format

```markdown
## Churn Signals — {TOPIC}

### Price-Related Cancellations
- "I cancelled because $20/month is insane for what this does"  
  Source: https://reddit.com/r/productivity/comments/... (1.2k upvotes)

### Switches to Competitors
- "I switched to Notion because it actually does this properly"  
  Source: https://reddit.com/r/... (340 upvotes)

### Dealbreakers
- "The lack of offline mode is a dealbreaker, sorry"
  Source: https://reddit.com/r/... (89 upvotes)
```

## Key Metrics

- Total churn-related quotes found
- Breakdown by reason (price, features, UX, reliability, competitor)
- Average upvotes on churn posts (indicates shared pain)
- Subreddits with highest churn signal density
