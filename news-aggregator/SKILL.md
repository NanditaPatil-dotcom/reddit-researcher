---
name: news-aggregator
description: |
  Collect and cluster news coverage on any topic from multiple sources.
  Finds recent articles, extracts key angles, identifies narrative trends,
  and surfaces what different outlets are saying. Use for media monitoring,
  competitive PR tracking, or staying on top of a fast-moving topic.
  Triggers: "news on", "media coverage of", "what are people writing about",
  "news aggregation for", "press coverage", "media monitoring for",
  "what's being written about".
license: MIT
compatibility: Requires bb CLI. News sites mostly work via fetch. Use browse for paywalled content.
allowed-tools: Bash Agent
---

# News Aggregator

Collect and cluster news coverage on any topic from multiple sources. Extracts article angles, identifies narrative trends, and surfaces what different media outlets are emphasizing.

**No API keys required** for basic use (uses search + fetch).

**Output directory**: `~/Desktop/{slug}_news_{YYYY-MM-DD}/`

---

## What It Extracts

### Per Article
- Title, outlet, author, date
- Article summary (first 3-4 paragraphs)
- Key claims or angles
- Quotes from people mentioned
- Links to related coverage

### Across Articles
- Common narrative angles (what everyone is saying)
- Unique angles (contrarian or exclusive takes)
- Key people/companies quoted
- Sentiment trend (positive / negative / neutral)
- Timeline of how the story evolved

---

## Data Sources

| Source | Method | Notes |
|--------|--------|-------|
| Google News | `bb search` with `news.google.com` | Fast, broad |
| Direct outlets | `bb fetch` | Best quality |
| RSS feeds | `bb fetch` on feed URL | Structured |
| HN / Reddit | See those skills | Tech community |

---

## Pipeline

### Step 1: Discovery via Search

```bash
TOPIC="{TOPIC}"
DATE_FILTER="after:$(date -d '7 days ago' +%Y-%m-%d)"  # last 7 days

# Broad news search
bb search "${TOPIC} news ${DATE_FILTER}" --num-results 15

# Find specific angles
bb search "${TOPIC} announcement ${DATE_FILTER}" --num-results 10
bb search "${TOPIC} analysis ${DATE_FILTER}" --num-results 10
bb search "${TOPIC} criticism OR concerns ${DATE_FILTER}" --num-results 10

# Specific outlets
bb search "site:techcrunch.com ${TOPIC}" --num-results 5
bb search "site:theverge.com ${TOPIC}" --num-results 5
bb search "site:wired.com ${TOPIC}" --num-results 5
```

### Step 2: Fetch Article Content

```bash
# Use fetch for most news sites
for URL in "${ARTICLE_URLS[@]}"; do
  bb fetch --allow-redirects "$URL" --output "/tmp/article_$(echo $URL | md5sum | head -c8).json"
  sleep 1
done

# Parse content from fetch response
node -e "
  const data = JSON.parse(require('fs').readFileSync('/tmp/article.json','utf8'));
  const html = data.content;
  // Extract headline, byline, body paragraphs
  const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const bodyText = html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,3000);
  console.log({ title: titleMatch?.[1], body: bodyText });
"
```

### Step 3: Paywalled Articles

```bash
browse env remote   # use remote for better success rate
browse open "{PAYWALLED_URL}"
browse wait load
browse wait timeout 2000
browse get text "article"   # try article selector first
browse get text "body"      # fallback to full page
browse stop
```

### Step 4: Cluster by Angle

Group articles by narrative:
```
Angle A: "Company does X, here's why it matters"
Angle B: "Critics say X has problems"
Angle C: "Industry reactions to X"
Angle D: "What X means for the future of Y"
```

Identify:
- Dominant narrative (what most articles say)
- Dissenting views (what 1-2 outlets push back on)
- Missing angles (what nobody is covering)

---

## Output Format

```markdown
---
topic: {TOPIC}
articles_analyzed: {N}
date_range: {start} – {end}
outlets_covered: {N}
researched_at: {ISO date}
---

## Coverage Summary

**Dominant narrative**: {what most articles say}
**Dissenting view**: {contrarian take}
**Missing angle**: {what nobody is covering}

## Articles by Angle

### Angle: {Angle Name}

#### {Article Title}
**Outlet**: {Name} | **Author**: {Name} | **Date**: {date}
**URL**: {URL}

**Summary**: {2-3 sentence summary in own words}

**Key Quote**: "{quote from article}"

**Unique claim**: {what this article says that others don't}

---

## Key People Quoted
| Person | Role | Quoted In |
|--------|------|-----------|
| {name} | {title} | {N} articles |

## Timeline
| Date | Event | Outlet |
|------|-------|--------|
| {date} | {headline} | {outlet} |

## Sentiment Distribution
- Positive: {N}% of coverage
- Neutral: {N}%
- Negative/Critical: {N}%

## Outlets Coverage Matrix
| Outlet | Articles | Angle | Sentiment |
|--------|---------|-------|-----------|
| TechCrunch | {N} | {angle} | {sentiment} |
| The Verge | {N} | {angle} | {sentiment} |
```

---

## Key Use Cases

1. **Media monitoring** — track how your company/product is covered
2. **Competitive PR** — what's being written about your competitors
3. **Topic research** — understand a fast-moving story from multiple angles
4. **Journalist mapping** — who covers your beat and what angles they take
5. **Crisis monitoring** — track negative coverage in real time