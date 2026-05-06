---
name: product-hunt-scout
description: |
  Track Product Hunt launches — new products, upvote trends, maker comments,
  and user feedback. Find what's launching in a category, who's building it,
  and what real users say in comments. Use for competitive intelligence,
  market mapping, or finding inspiration.
  Triggers: "product hunt launches in", "what's new on PH", "PH scout for",
  "product hunt research", "find launches in", "who launched", "PH comments for".
license: MIT
compatibility: Requires browse CLI. PH works in local mode for most browsing. Use remote for anti-bot protection if needed.
allowed-tools: Bash Agent
---

# Product Hunt Scout

Track Product Hunt launches, upvote trends, maker activity, and user comments. Extracts competitive intelligence and community feedback from PH's public content.

**Output directory**: `~/Desktop/{slug}_ph_{YYYY-MM-DD}/`

---

## What It Extracts

### Launch Data
- Product name, tagline, description
- Upvote count and rank (today / this week / this month)
- Maker names and backgrounds
- Launch date
- Category / topics
- Links (website, GitHub, App Store)

### Community Signals
- Top comments (positive and critical)
- Maker responses
- Hunter background (influential vs unknown)
- Follower-to-upvote ratio (organic vs paid)

### Category Trends
- Most upvoted products in a category over time
- Recurring pain points in comments
- Features users explicitly praise or request

---

## Data Sources

| Source | What | How |
|--------|------|-----|
| `producthunt.com/posts` | Today's launches | browse |
| `producthunt.com/topics/{topic}` | Category products | browse |
| `api.producthunt.com` | Structured data | fetch (OAuth needed for write) |
| PH search | Find specific products | browse |

---

## Pipeline

### Step 1: Browse Category or Daily Feed

```bash
browse env local
browse open "https://www.producthunt.com/topics/{TOPIC}"
browse wait load
browse wait timeout 2000
browse snapshot   # find product cards
browse get text "body"
```

Or today's top:
```bash
browse open "https://www.producthunt.com"
browse wait load
browse get text "body"
```

### Step 2: Search for Specific Topic

```bash
browse open "https://www.producthunt.com/search?q={TOPIC}"
browse wait load
browse get text "body"
```

Or use Google:
```bash
bb search "site:producthunt.com {TOPIC} {YEAR}" --num-results 15
```

### Step 3: Open Individual Product Page

```bash
browse open "https://www.producthunt.com/posts/{PRODUCT_SLUG}"
browse wait load
browse wait timeout 1500
browse scroll 500 500 0 800    # load comments
browse get text "body"
```

Extract:
- Upvote count
- All comments (sort by top)
- Maker Q&A
- Linked websites

### Step 4: Maker Research

```bash
browse open "https://www.producthunt.com/@{MAKER_USERNAME}"
browse wait load
browse get text "body"
```

---

## Output Format

```markdown
---
topic: {TOPIC}
total_products: {N}
date_range: {time period}
researched_at: {ISO date}
---

## Top Products

### 1. {Product Name}
**Tagline**: {tagline}
**Upvotes**: {N} | **Rank**: #{N} of the day/week
**URL**: https://producthunt.com/posts/{slug}
**Website**: {URL}
**Launched**: {date}
**Maker**: {name} (@{handle})
**Topics**: {topic1}, {topic2}

**Description**:
{product description}

**Top Comments**:
> "{comment}" — {username}, {upvotes}↑

> "{comment}" — {username}

**Maker Response**:
> "{maker quote}"

**Sentiment**: Positive | Mixed | Critical
**Key Praise**: {what users love}
**Key Criticism**: {what users complain about}

---

## Category Trends

| Signal | Finding |
|--------|---------|
| Most upvoted feature | {feature mentioned most} |
| Recurring pain point | {problem in comments} |
| Common alternatives mentioned | {tools compared to} |
| Launch timing | {what day/time gets traction} |

## Maker Landscape
| Maker | Products Launched | Notable Background |
|-------|------------------|--------------------|
| {name} | {N} | {company/background} |
```

---

## Key Use Cases

1. **Competitive monitoring** — track competitors launching on PH
2. **Market mapping** — what's been built in a category over the past year
3. **Launch research** — what makes a successful PH launch (comments, timing)
4. **Founder discovery** — find active builders in a space
5. **User feedback mining** — real user reactions to new products