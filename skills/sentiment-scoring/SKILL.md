---
name: sentiment-scoring
description: |
  Tag quotes as frustration, praise, confusion, urgency, workaround, churn risk.
  Scores sentiment intensity and categorizes emotional tone.
triggers:
  - "sentiment analysis for"
  - "emotional tone of"
  - "frustration in"
  - "praise for"
critical_rules:
  - Every tagged quote must be verbatim with source URL
  - Sentiment categories must be mutually exclusive (one primary tag per quote)
  - Intensity scores must be based on explicit emotional language
output:
  - $OUTPUT_DIR/sentiment_analysis.md — categorized quotes with intensity scores
  - $OUTPUT_DIR/sentiment_summary.csv — counts and averages by category
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# Sentiment Scoring

Analyzes emotional tone of Reddit quotes, categorizing them into distinct sentiment types with intensity scoring.

## Sentiment Categories

- **Frustration**: Anger, annoyance, disappointment — "so frustrating", "infuriating", "disappointed", "annoying"
- **Praise**: Positive endorsement, satisfaction — "love", "amazing", "perfect", "exactly what I needed"
- **Confusion**: Uncertainty, complexity complaints — "confusing", "don't understand", "unclear", "complicated"
- **Urgency**: Time-sensitive needs, immediate problems — "urgent", "critical", "ASAP", "emergency", "blocked"
- **Workaround**: Creative solutions, hacks — "hack", "workaround", "trick", "found a way", "cobbled together"
- **Churn Risk**: Cancellation, switching intent — "cancelling", "switching", "leaving", "done with"

## Pipeline

1. **Extract emotional markers** — scan for sentiment indicators in all quotes
2. **Classify primary sentiment** — assign one dominant category per quote
3. **Score intensity** — 1-5 scale based on emotional language strength
4. **Context validation** — ensure classification matches full comment context
5. **Aggregate patterns** — identify sentiment trends by theme/subreddit

## Usage

```bash
# Sentiment analysis runs automatically during theme clustering
# Can be run standalone on extracted data
node scripts/sentiment-score.mjs $OUTPUT_DIR/raw
```

## Output Format

```markdown
## Sentiment Analysis — {TOPIC}

### Frustration (Intensity 3-5)
- "This is so **frustrating** — it worked last week and now it's broken"  
  Intensity: 4 | Source: https://reddit.com/r/... (234 upvotes)
- "**Infuriating** that the basic feature doesn't work"  
  Intensity: 5 | Source: https://reddit.com/r/... (89 upvotes)

### Confusion (Intensity 2-4)
- "I'm **confused** about how to set this up"  
  Intensity: 2 | Source: https://reddit.com/r/... (45 upvotes)
- "The documentation is completely **unclear**"  
  Intensity: 3 | Source: https://reddit.com/r/... (167 upvotes)

### Workaround (Intensity 1-3)
- "Found a **workaround** using the API directly"  
  Intensity: 1 | Source: https://reddit.com/r/... (78 upvotes)
- "**Hacked** together a solution with Zapier"  
  Intensity: 2 | Source: https://reddit.com/r/... (34 upvotes)
```

## Key Metrics

- Sentiment distribution (% by category)
- Average intensity score per category
- Most common sentiment by theme/subreddit
- Sentiment correlation with upvotes (shared pain/praise)
- Workaround frequency (indicates missing features)
