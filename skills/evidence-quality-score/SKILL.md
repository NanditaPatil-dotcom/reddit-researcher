---
name: evidence-quality-score
description: |
  Rate each finding based on source quality: upvotes, recency, comment depth, repeated mentions.
  Scores evidence reliability from 0-100 for prioritization.
triggers:
  - "evidence quality for"
  - "reliable sources"
  - "high confidence findings"
  - "source scoring"
critical_rules:
  - Score must be calculated from explicit metrics, not subjective judgment
  - All scoring factors must be documented with raw values
  - Never score without source URL and metadata
output:
  - $OUTPUT_DIR/evidence_scores.md — quality-rated findings
  - $OUTPUT_DIR/evidence_scores.csv — detailed scoring breakdown
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# Evidence Quality Score

Rates the reliability and strength of each finding using objective metrics: source authority, recency, engagement, and corroboration.

## Scoring Formula

**Total Score = Authority (25) + Recency (20) + Engagement (25) + Corroboration (30)**

Max score: 100 points

### Authority (0-25 points)
Source credibility based on community trust:

| Upvotes | Points | Description |
|---------|--------|-------------|
| 0-9 | 5 | Low visibility, minimal community validation |
| 10-49 | 10 | Moderate engagement, some community trust |
| 50-199 | 15 | High engagement, strong community validation |
| 200-499 | 20 | Very high engagement, authoritative source |
| 500+ | 25 | Highly authoritative, widely trusted |

**Bonus**: +5 points if post is by known expert/flair in subreddit

### Recency (0-20 points)
How recent the discussion is:

| Age | Points | Description |
|-----|--------|-------------|
| 0-7 days | 20 | Current, highly relevant |
| 8-30 days | 15 | Recent, still relevant |
| 31-90 days | 10 | Moderately recent |
| 91-180 days | 5 | Older, may be outdated |
| 181+ days | 0 | Outdated, low relevance |

### Engagement (0-25 points)
Depth and quality of discussion:

| Metric | Points |
|--------|--------|
| Comment count 0-2 | 5 |
| Comment count 3-9 | 10 |
| Comment count 10-24 | 15 |
| Comment count 25+ | 20 |

**Depth bonus**: +5 points if thread has nested replies (sub-comments) showing detailed discussion

### Corroboration (0-30 points)
Multiple independent sources confirming the finding:

| Mentions | Points | Description |
|----------|--------|-------------|
| 1 (unique) | 10 | Single source, needs verification |
| 2-3 | 20 | Some corroboration |
| 4-5 | 25 | Good corroboration |
| 6-9 | 28 | Strong corroboration |
| 10+ | 30 | Highly corroborated, consistent pattern |

**Cross-subreddit bonus**: +5 points if mentioned in 3+ different subreddits

## Quality Tiers

- **90-100**: Exceptional — Multiple authoritative sources, recent, highly corroborated
- **70-89**: High — Strong evidence, reliable sources
- **50-69**: Moderate — Some evidence, requires additional validation
- **30-49**: Low — Weak evidence, limited corroboration
- **0-29**: Minimal — Single source, outdated, or low authority

## Pipeline

1. **Extract metadata** — upvotes, date, comment count for each quote
2. **Calculate sub-scores** — authority, recency, engagement, corroboration
3. **Identify corroboration** — same finding across multiple posts/comments
4. **Compute total score** — sum all sub-scores
5. **Assign quality tier** — exceptional, high, moderate, low, minimal
6. **Output ranked list** — findings sorted by quality score

## Usage

```bash
# Quality scoring runs automatically during report generation
# Can filter findings by quality threshold
node scripts/score-evidence.mjs $OUTPUT_DIR/raw --min-score 70
```

## Output Format

```markdown
## Evidence Quality Scores — {TOPIC}

### Exceptional Quality (90-100)

**Finding**: "I cancelled because the price doubled and they removed API access"  
**Score**: 95/100  
**Authority**: 25/25 (567 upvotes)  
**Recency**: 15/20 (12 days ago)  
**Engagement**: 25/25 (34 comments, detailed discussion)  
**Corroboration**: 30/30 (12 independent mentions across 4 subreddits)  
**Source**: r/productivity, https://reddit.com/...  
**Verdict**: Highly reliable churn signal

### High Quality (70-89)

**Finding**: "The mobile app crashes constantly, can't use it on the go"  
**Score**: 78/100  
**Authority**: 15/25 (89 upvotes)  
**Recency**: 20/20 (2 days ago)  
**Engagement**: 20/25 (8 comments)  
**Corroboration**: 23/30 (3 mentions)  
**Source**: r/mobileapps, https://reddit.com/...  
**Verdict**: Reliable performance complaint
```

## CSV Output

```csv
quote,authority_score,recency_score,engagement_score,corroboration_score,total_score,tier,source_url
"I cancelled because...",25,15,25,30,95,exceptional,https://reddit.com/...
"The mobile app crashes",15,20,20,23,78,high,https://reddit.com/...
```

## Key Metrics

- Average quality score across all findings
- Distribution by quality tier (% exceptional, high, etc.)
- Lowest-scoring findings (needs investigation)
- Highest-scoring pain points (priority actions)
- Corroboration rate (findings with 3+ sources)
