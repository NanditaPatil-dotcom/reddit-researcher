---
name: hacker-news-digest
description: |
  Surface top Hacker News threads on any topic and extract high-signal
  comments. Finds Show HN posts, Ask HN threads, and news discussions
  related to a keyword. Extracts top comments, sentiment, and key opinions
  from the technical community.
  Triggers: "HN discussion on", "hacker news for", "what does HN think about",
  "Show HN for", "tech community opinion on", "hacker news digest",
  "find HN threads about".
license: MIT
compatibility: Requires bb CLI. HN's public API and search work without BROWSERBASE_API_KEY.
allowed-tools: Bash Agent
---

# Hacker News Digest

Surface Hacker News threads on any topic and extract high-signal comments from the technical community. Uses HN's public Algolia search API — no API keys needed.

**No API keys required** — HN has a public search API.

**Output directory**: `~/Desktop/{slug}_hn_{YYYY-MM-DD}/`

---

## What It Extracts

- Top threads by topic (sorted by points or recency)
- Post type: Show HN, Ask HN, news, job
- Top comments (sorted by score)
- Key opinions and technical perspectives
- Sentiment breakdown (positive/skeptical/critical)
- Links to further reading shared in comments

---

## Data Sources

| Source | Endpoint | What for |
|--------|----------|----------|
| HN Algolia API | `hn.algolia.com/api/v1/search` | Fast, structured search |
| HN Firebase API | `hacker-news.firebaseio.com` | Real-time item data |
| HN website | `news.ycombinator.com` | Full threads via browse |

---

## Pipeline

### Step 1: Search via Algolia API (Free, No Auth)

```bash
# Search all HN content
curl "https://hn.algolia.com/api/v1/search?query={TOPIC}&tags=story&hitsPerPage=20" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    d.hits.forEach(h => console.log(h.points, h.title, h.objectID));
  "

# Search only Show HN posts
curl "https://hn.algolia.com/api/v1/search?query={TOPIC}&tags=show_hn&hitsPerPage=10"

# Search only Ask HN posts
curl "https://hn.algolia.com/api/v1/search?query={TOPIC}&tags=ask_hn&hitsPerPage=10"

# Recent discussions (past 30 days)
curl "https://hn.algolia.com/api/v1/search_by_date?query={TOPIC}&tags=story&numericFilters=created_at_i>$(date -d '30 days ago' +%s)"
```

### Step 2: Get Full Thread + Comments

```bash
# Fetch item data from Firebase API
STORY_ID="{HN_STORY_ID}"
curl "https://hacker-news.firebaseio.com/v0/item/${STORY_ID}.json" | node -e "
  const item = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(JSON.stringify({ title: item.title, score: item.score, kids: item.kids?.slice(0,20) }));
"

# Or browse the full thread
browse env local
browse open "https://news.ycombinator.com/item?id={STORY_ID}"
browse wait load
browse get text "body"
browse stop
```

### Step 3: Extract Top Comments

For each comment ID from `kids` array:
```bash
curl "https://hacker-news.firebaseio.com/v0/item/{COMMENT_ID}.json"
```

Sort by score, take top 10-15.

### Step 4: Cluster by Signal Type

Group comments into:
- **Positive signals** — praise, endorsement, "this is great"
- **Skeptical signals** — technical concerns, "but what about X"
- **Critical signals** — fundamental objections, "this doesn't work because"
- **Resource links** — URLs to papers, tools, alternatives shared in comments
- **Competitive mentions** — other tools mentioned positively

---

## Output Format

```markdown
---
topic: {TOPIC}
total_threads: {N}
date_range: past year
researched_at: {ISO date}
---

## Top Threads

### 1. {Post Title} ({N} points, {M} comments)
**Type**: Show HN | Ask HN | News
**URL**: https://news.ycombinator.com/item?id={ID}
**Posted**: {date}

**Top Comments**:
> "{comment text}"  — {score} points

> "{comment text}" — {score} points

**Signal**: {positive/skeptical/critical}
**Key Takeaway**: {1 sentence summary of community opinion}

---

### 2. {Post Title}
...

## Community Sentiment Summary

| Sentiment | Count | Key Quote |
|-----------|-------|-----------|
| Positive | {N} | "..." |
| Skeptical | {N} | "..." |
| Critical | {N} | "..." |

## Frequently Mentioned Alternatives
- {Tool/resource}: mentioned {N} times

## Key Technical Concerns Raised
- {Concern 1}: mentioned in {N} threads
- {Concern 2}: ...
```

---

## Key Use Cases

1. **Technical community pulse** — what do engineers actually think about a topic
2. **Show HN benchmarking** — what gets traction when launching on HN
3. **Competitive intelligence** — which tools get praised vs criticized
4. **Content research** — what angles resonate with technical readers
5. **Problem validation** — do engineers recognize the problem you're solving