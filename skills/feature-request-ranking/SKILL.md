---
name: feature-request-ranking
description: |
  Score requested features by frequency, intensity, and comment agreement.
  Ranks feature requests by community demand and passion.
triggers:
  - "feature requests for"
  - "most requested"
  - "feature voting"
  - "community wants"
critical_rules:
  - Each request must have verbatim quotes and source URLs
  - Frequency counts must be based on unique independent mentions
  - Intensity based on explicit emotional language, not inferred
output:
  - $OUTPUT_DIR/feature_requests.md — ranked feature requests with scores
  - $OUTPUT_DIR/feature_requests.csv — detailed scoring data
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# Feature Request Ranking

Scores and ranks feature requests based on frequency, user intensity, and community agreement.

## Scoring Algorithm

### Frequency Score (0-10 points)
- Raw count of independent mentions across all posts/comments
- Weighted by subreddit (larger subreddits = more weight)
- Recent mentions weighted higher (past 3 months = 1.5x)

### Intensity Score (0-10 points)
Based on explicit emotional language:
- **Low (1-3)**: "would be nice", "maybe add", "it'd be cool"
- **Medium (4-6)**: "need", "wish", "should have", "really want"
- **High (7-10)**: "desperate", "critical", "must have", "can't live without"

### Agreement Score (0-10 points)
- Upvotes on request post/comment (normalized)
- "+1", "same", "me too" comments in thread
- Awards/emoji reactions (if applicable)

### Total Score = Frequency + Intensity + Agreement (max 30)

## Pipeline

1. **Identify requests** — scan for "wish", "need", "should", "please add"
2. **Normalize features** — group variants ("dark mode" = "dark theme" = "night mode")
3. **Score each dimension** — frequency, intensity, agreement
4. **Rank by total score** — highest community demand first
5. **Output detailed report** — with quotes and evidence

## Usage

```bash
# Search specifically for feature requests
bb search "wish {TOPIC} had" --num-results 20
bb search "{TOPIC} should add" --num-results 20
bb search "need {TOPIC} feature" --num-results 20
```

## Output Format

```markdown
## Feature Request Ranking — {TOPIC}

| Rank | Feature | Frequency | Intensity | Agreement | Total | Key Quotes |
|------|---------|-----------|-----------|-----------|-------|------------|
| 1 | Dark Mode | 8 | 7 | 9 | **24** | "I **need** dark mode for night work" (r/productivity, 234 upvotes) |
| 2 | Offline Mode | 6 | 9 | 7 | **22** | "This is **critical** — I can't work without offline" (r/tech, 156 upvotes) |
| 3 | API Access | 5 | 6 | 8 | **19** | "Please add API, would be **huge**" (r/webdev, 89 upvotes) |

### Top Request: Dark Mode (Score: 24/30)
**Frequency**: 8 unique mentions across 5 subreddits  
**Most Intense**: "I **desperately need** dark mode or I can't use this at night" (Intensity: 10)  
**Community Agreement**: 234 upvotes, 47 "+1" comments  

**Representative Quotes**:
- "Would pay extra for dark mode" — r/productivity (89 upvotes)
- "Dark mode is standard in 2024, this is embarrassing" — r/tech (167 upvotes)
```

## Key Metrics

- Total unique feature requests identified
- Top 10 highest-scored requests
- Average intensity score (community passion level)
- Features with high frequency but low intensity (nice-to-haves)
- Features with high intensity but low frequency (niche but passionate)
