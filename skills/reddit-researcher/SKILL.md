---
name: reddit-researcher
description: |
  Deep-dives subreddits to extract product feedback, pain points, and PMF signals.
  Takes a topic or product name, searches relevant subreddits, scrapes posts and
  comment threads, clusters findings by theme, and generates a research report.
  Use when the user wants to: (1) find pain points around a topic, (2) do PMF
  research, (3) understand what users complain about, (4) find competitor weaknesses,
  (5) discover what language real users use about a problem.
  Triggers: "research reddit for", "find pain points about", "what do people say about",
  "subreddit research", "PMF research", "reddit feedback on", "mine reddit for".
license: MIT
compatibility: Requires bb CLI (@browserbasehq/cli) and browse CLI (@browserbasehq/browse-cli). No API key needed for public subreddits.
allowed-tools: Bash Agent
---

# Reddit Researcher

Deep-dive subreddits for product feedback, pain points, and PMF signals. Takes a
topic → searches Reddit → scrapes posts + comments → clusters by theme → outputs
a report showing what people actually complain about and what they wish existed.

**Required**: `browse` CLI installed (`@browserbasehq/browse-cli`)

**Output directory**: All output goes to `~/Desktop/{topic_slug}_reddit_{YYYY-MM-DD}/`
Final deliverable is `index.html` (themed findings report) + `results.csv` for further analysis.

**CRITICAL — Tool restrictions**:
- All page extraction: use `browse` CLI to open Reddit pages and get content
- All searches: use `bb search` to find relevant posts. NEVER use WebSearch.
- All file writes: use bash heredoc. NEVER use the Write tool.
- Subagents must use ONLY the Bash tool.

**CRITICAL — Anti-hallucination rules**:
- NEVER invent quotes or paraphrase from memory
- Every pain point MUST be quoted directly from a real post/comment
- Every finding MUST include the Reddit URL it came from
- If a post has no useful signal, skip it — do not fill in the gaps

---

## Available Skills

### Core Analysis Skills (FREE — no API keys required)

1. **churn-signal-extraction** — Extract quotes indicating churn: "I cancelled," "I switched," "dealbreaker," "not worth it." Identifies users who left or are about to leave.
2. **competitor-matrix** — Extract "switched from/to" mentions into a comparison table showing migration patterns between tools.
3. **persona-detection** — Cluster findings by user type: student, founder, engineer, creator, team lead, etc. Automatically identifies personas from language patterns.
4. **sentiment-scoring** — Tag quotes as frustration, praise, confusion, urgency, workaround, churn risk. Scores sentiment intensity 1-5.
5. **feature-request-ranking** — Score requested features by frequency, intensity, and comment agreement. Ranks by community demand.
6. **evidence-quality-score** — Rate each finding 0-100 based on source quality: upvotes, recency, comment depth, repeated mentions.
7. **csv-schema-enforcement** — Define exact columns so reports are easier to compare across topics. Standardized schema for dashboards.
8. **landing-page-copy-generator** — Turn real user phrases into headline/value-prop/testimonial-style copy for landing pages.
9. **founder-summary-mode** — Generate a terse "what to build / what to avoid / how to position" brief for founders.

### Premium Skills (Require Paid APIs)

10. **notion-export** — Push final report into a Notion page/database. *(Requires Notion API key - Not Free)*

---

## Pipeline Overview

Follow these steps in order:

1. **Setup** — create output directory
2. **Topic Analysis** — understand what we are researching
3. **Subreddit Discovery** — find the best subreddits for this topic
4. **Post Discovery** — find high-signal posts (sorted by top/hot)
5. **Content Extraction** — scrape posts + comment threads
6. **Theme Clustering** — group findings into pain point categories
7. **Skill Application** — apply analysis skills (churn, persona, sentiment, etc.)
8. **PMF Signal Analysis** — find gaps, opportunities, competitor weaknesses
9. **Report Generation** — HTML report + CSV

---

## Step 0: Setup

```bash
TOPIC_SLUG=$(echo "{TOPIC}" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
DATE=$(date +%Y-%m-%d)
OUTPUT_DIR=~/Desktop/${TOPIC_SLUG}_reddit_${DATE}
mkdir -p "$OUTPUT_DIR/raw" "$OUTPUT_DIR/themes"
```

Ask the user:
- What topic/product are you researching?
- Any specific subreddits? (or let the skill discover them)
- Time range? (past month / past year / all time) — default: past year
- Minimum upvotes for a post to count? — default: 10

---

## Step 1: Subreddit Discovery

If no subreddits specified, find the best ones:

```bash
bb search "best subreddit for {TOPIC} users reddit" --num-results 10
bb search "r/ {TOPIC} community reddit" --num-results 10
```

Pick the top 3-5 most relevant subreddits. Common patterns:
- The product's own subreddit (r/notion, r/obsidian)
- The category subreddit (r/productivity, r/selfhosted)
- The audience subreddit (r/entrepreneur, r/smallbusiness)

Write discovered subreddits to `$OUTPUT_DIR/subreddits.txt`

---

## Step 2: Post Discovery

For each subreddit, find high-signal posts:

```bash
browse env local
browse open "https://www.reddit.com/r/{SUBREDDIT}/search/?q={TOPIC}&sort=top&t=year"
browse wait load
browse wait timeout 2000
browse snapshot
```

Extract post titles + URLs. Target 20-30 posts per subreddit.
Also search for specific pain-point keywords:
- "{TOPIC} problem"
- "{TOPIC} frustrated"
- "{TOPIC} wish"
- "{TOPIC} alternative"
- "{TOPIC} switched"
- "hate {TOPIC}"
- "{TOPIC} vs"

Write all post URLs to `$OUTPUT_DIR/raw/posts.txt` (deduplicated)

---

## Step 3: Content Extraction

For each post URL, extract the full thread:

```bash
browse open "{POST_URL}"
browse wait load
browse wait timeout 1500
browse get text "body"
```

For each post, extract and save:
- Post title
- Post body text
- Top 10-15 comments (sorted by upvotes)
- Post upvote count
- Comment count
- URL

Write to `$OUTPUT_DIR/raw/{post-slug}.md` using heredoc.

**Hard cap**: Max 50 posts total across all subreddits. Quality over quantity.

**Signal keywords to flag** (mark these comments as HIGH SIGNAL):
```
"I wish", "why can't", "so frustrating", "switched to", "switched from",
"dealbreaker", "the problem is", "missing feature", "please add",
"anyone else", "workaround", "hack", "broken", "slow", "expensive",
"too complicated", "confusing", "alternative to"
```

---

## Step 4: Theme Clustering

Read all extracted content and group pain points into themes.

Standard theme categories:
```
PRICING          → too expensive, no free tier, pricing confusion
PERFORMANCE      → slow, crashes, laggy, unreliable
MISSING_FEATURE  → people asking for X that doesn't exist
UX_CONFUSION     → hard to learn, confusing UI, bad onboarding  
RELIABILITY      → data loss, sync issues, bugs
COMPETITOR_GAP   → "switched to X because", "X does this better"
LOVE_SIGNALS     → what people genuinely like (don't break this)
OPPORTUNITY      → pain points with NO good solution yet
```

For each theme write to `$OUTPUT_DIR/themes/{theme}.md`:
```markdown
---
theme: PRICING
mention_count: 34
high_signal_count: 12
---

## Direct Quotes
- "I cancelled because $X/month is insane for what it does" (r/productivity, 847 upvotes)
  source: https://reddit.com/r/...

- "Why is the free tier so limited compared to competitors?" (r/notion, 234 upvotes)
  source: https://reddit.com/r/...

## Pattern Summary
Most complaints center around...
```

---

## Step 5: PMF Signal Analysis

After clustering, identify:

**Opportunity signals** (highest value):
- Pain points mentioned 10+ times with NO suggested solution
- People describing workarounds (means they want it but gave up)
- Posts asking "does X exist?" with no good answer in comments

**Competitor intelligence**:
- What tools do people switch TO? (threat)
- What tools do people switch FROM to your category? (opportunity)
- What do people say competitor X does better?

**Your marketing copy**:
- Exact phrases users use to describe their problem
- These are the words to use in your landing page

Write analysis to `$OUTPUT_DIR/pmf_signals.md`

---

## Step 6: Report Generation

```bash
node ~/reddit-researcher/scripts/compile_report.mjs $OUTPUT_DIR --open
```

Generates:
- `$OUTPUT_DIR/index.html` — visual report with theme breakdown
- `$OUTPUT_DIR/results.csv` — all findings as spreadsheet
- `$OUTPUT_DIR/pmf_signals.md` — opportunity analysis

---

## Final Report Summary (in chat)

```
## Reddit Research Complete — {TOPIC}

- **Subreddits searched**: {list}
- **Posts analyzed**: {count}
- **Comments extracted**: {count}
- **Pain points found**: {count}

## Theme Breakdown
| Theme           | Mentions | Top Quote |
|-----------------|----------|-----------|
| MISSING_FEATURE | 41       | "..."     |
| PRICING         | 34       | "..."     |
| PERFORMANCE     | 28       | "..."     |

## Top Opportunity
{The biggest unsolved pain point with direct quotes}

## What People Actually Say (use this in your copy)
{Real phrases extracted from posts}
```