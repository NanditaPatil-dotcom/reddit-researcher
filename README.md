# Reddit Researcher

Deep-dive subreddits to extract product feedback, pain points, competitive signals, and PMF (Product-Market Fit) insights. Transform Reddit discussions into structured research reports with theme clustering, sentiment analysis, persona detection, and competitive intelligence.

**Perfect for**: Product managers, founders, researchers, and marketers who want to understand what users actually want, complain about, and struggle with.

---

## Features

- **Automated Reddit Research** — Searches relevant subreddits and scrapes posts + full comment threads using public Reddit API (no authentication needed)
- **Intelligent Theme Clustering** — Automatically groups findings into pain points, opportunities, and feature requests
- **Multi-Skill Analysis Pipeline** — Apply optional analysis to extracted data:
  -  **Churn Signal Extraction** — Detect users who switched products or are about to leave
  -  **Competitor Matrix** — Map migration patterns between competing tools
  -  **Persona Detection** — Identify user archetypes (engineer, founder, student, etc.)
  -  **Sentiment Scoring** — Tag sentiment (frustration, praise, confusion, urgency)
  -  **Feature Request Ranking** — Score requested features by demand/intensity
  -  **Evidence Quality Scoring** — Rate finding credibility based on upvotes, recency, engagement
  -  **Landing Page Copy Generator** — Convert user phrases into marketing headlines
  -  **Founder Summary** — Generate actionable brief (what to build, what to avoid)
- **Interactive HTML Report** — Beautiful, shareable research dashboard with grid layout
- **CSV Export** — Spreadsheet with all themes, posts, and metrics for further analysis
- **Zero Dependencies** — Uses Node.js only; all content extracted via public Reddit API

---

##  Requirements

- **Node.js** 14+ (tested with v18+)
- **Internet connection** (to fetch Reddit data)
- No API keys or authentication required — uses public Reddit JSON API

---

##  Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/NanditaPatil-dotcom/reddit-researcher.git
cd reddit-researcher
npm install
```

### 2. Run a Research

```bash
# Basic usage: research a topic
node scripts/reddit_extract.mjs --topic "obsidian alternative"

# With options
node scripts/reddit_extract.mjs --topic "notion" \
  --subreddits productivity,nocode,notion \
  --limit 50 \
  --time year

# Compile the report
node scripts/compile_report.mjs ~/Desktop/obsidian-alternative_reddit_2026-05-06 --open
```

### 3. View the Report

Open `index.html` or use the `--open` flag to auto-launch in your browser.

---

##  Workflow Overview

There are two main phases:

### Phase 1: Data Extraction (`reddit_extract.mjs`)

```
Topic Input
    ↓
Discover relevant subreddits
    ↓
Search for relevant posts (top/hot, past year)
    ↓
Fetch full post + comment threads
    ↓
Extract pain points, opportunities, quotes
    ↓
Output: raw/index.json, raw/*.md, themes/*.md
```

**Output directory**: `~/Desktop/{topic-slug}_reddit_{YYYY-MM-DD}/`

### Phase 2: Report Compilation (`compile_report.mjs`)

```
raw/index.json + raw/*.md + themes/*.md
    ↓
Load optional skill outputs (personas, sentiment, etc.)
    ↓
Sort posts by score, themes by mention count
    ↓
Render HTML dashboard + CSV spreadsheet
    ↓
Output: index.html, results.csv
```

---

##  Command Reference

### `reddit_extract.mjs` — Extract Reddit Data

Scrapes Reddit posts and comments, extracts signals, clusters into themes.

```bash
node scripts/reddit_extract.mjs --topic "TOPIC" [OPTIONS]
```

**Arguments:**
- `--topic TEXT` *(required)* — What to research (e.g., "obsidian", "notion alternative", "smallbiz accounting")
- `--subreddits LIST` *(optional)* — Comma-separated subreddit list (defaults: auto-discover)
  - Example: `productivity,nocode,notion,apps`
- `--limit NUMBER` *(optional)* — Max posts to process, default: 100
- `--time RANGE` *(optional)* — Time window: `week`, `month`, `year`, `all`, default: `year`
- `--output DIR` *(optional)* — Custom output directory (defaults: `~/Desktop/{slug}_reddit_{date}/`)
- `--verbose` *(optional)* — Print detailed logging
- `--help, -h` — Show help message

**Example:**

```bash
node scripts/reddit_extract.mjs \
  --topic "obsidian plugins" \
  --subreddits obsidian,productivity \
  --limit 75 \
  --time year \
  --verbose
```

**Output Files:**
```
output_dir/
├── raw/
│   ├── index.json          # Metadata: topic, sentiment breakdown, subreddits
│   ├── posts.json          # All posts with scores, dates, URLs
│   └── {post_id}.md        # Full post + top comments (pain points tagged)
├── themes/
│   ├── {theme_name}.md     # Grouped findings (pain points, opportunities)
│   └── ...
├── subreddits.txt          # List of subreddits researched
└── [compiled outputs]
    ├── index.html          # Report dashboard
    └── results.csv         # Spreadsheet export
```

---

### `compile_report.mjs` — Generate Report

Combines extracted data and optional skill outputs into a beautiful interactive report.

```bash
node scripts/compile_report.mjs <RESEARCH_DIR> [OPTIONS]
```

**Arguments:**
- `<RESEARCH_DIR>` *(required)* — Path to output directory from `reddit_extract.mjs`
- `--output PATH` *(optional)* — Custom HTML output path (default: `{research_dir}/index.html`)
- `--open` *(optional)* — Auto-open report in default browser
- `--help, -h` — Show help message

**Example:**

```bash
node scripts/compile_report.mjs ~/Desktop/obsidian-alternative_reddit_2026-05-06 --open
```

**Input Expected:**
- `raw/index.json` — Metadata and statistics
- `raw/*.md` — Individual posts with comments
- `themes/*.md` — Grouped findings
- *(optional)* `personas.json` — From persona-detection skill
- *(optional)* `sentiment.json` — From sentiment-scoring skill
- *(optional)* `churn_signals.json` — From churn-signal-extraction skill
- *(optional)* `competitor_matrix.json` — From competitor-matrix skill
- *(optional)* `feature_requests.json` — From feature-request-ranking skill
- *(optional)* `evidence_quality.json` — From evidence-quality-score skill
- *(optional)* `landing_page_copy.json` — From landing-page-copy-generator skill
- *(optional)* `founder_summary.json` — From founder-summary-mode skill

**Output:**
- `index.html` — Interactive HTML dashboard (shareable, works offline)
- `results.csv` — CSV with all themes, posts, metadata for Excel/Sheets

---

##  Available Skills

Skills are optional analysis modules that enrich the extracted data. If you have skill output JSON files in the research directory, they'll automatically be included in the report.

| Skill | Purpose | Input | Output |
|-------|---------|-------|--------|
| **churn-signal-extraction** | Find users who switched/left | Raw posts + comments | `churn_signals.json` with quotes like "I switched to", "cancelled", "dealbreaker" |
| **competitor-matrix** | Map switching patterns | Raw mentions of competing products | `competitor_matrix.json` with FROM/TO flows and counts |
| **persona-detection** | Identify user types | Language patterns in posts | `personas.json` with archetypes (engineer, founder, student, etc.) and mention counts |
| **sentiment-scoring** | Tag emotional tone | Posts + comments | `sentiment.json` with tags (frustrated, praise, confusion) and intensity 1-5 |
| **feature-request-ranking** | Score requested features | Posts containing feature requests | `feature_requests.json` ranked by frequency, intensity, agreement |
| **evidence-quality-score** | Rate finding credibility | Upvotes, dates, comment counts | `evidence_quality.json` with 0-100 scores and quality tiers |
| **landing-page-copy-generator** | Extract marketing copy | User quotes + pain points | `landing_page_copy.json` with headlines, value props, testimonials |
| **founder-summary-mode** | Executive brief for makers | All findings | `founder_summary.json` with what-to-build, what-to-avoid, positioning |

**To use skills:** Place their output JSON files in the research directory before running `compile_report.mjs`.

---

##  Project Structure

```
reddit-researcher/
├── README.md                       # This file
├── SKILL.md                        # Detailed skill documentation
├── package.json                    # Node.js dependencies
├── scripts/
│   ├── reddit_extract.mjs          # Phase 1: Extract data from Reddit
│   └── compile_report.mjs          # Phase 2: Generate HTML report
├── skills/
│   ├── churn-signal-extraction/    # Detect product switches
│   ├── competitor-matrix/          # Map competitive moves
│   ├── persona-detection/          # Identify user archetypes
│   ├── sentiment-scoring/          # Score sentiment
│   ├── feature-request-ranking/    # Rank feature requests
│   ├── evidence-quality-score/     # Rate finding credibility
│   ├── landing-page-copy-generator/# Extract marketing copy
│   ├── founder-summary-mode/       # Generate executive briefs
│   └── [other skills...]
└── tests/                          # Test files
```

---

##  Output Formats

### `index.html` Report

Interactive dashboard with:
- **Stats banner** — Posts analyzed, comments seen, themes found, time period
- **Theme grid** — Pain points, opportunities, missing features (2-column layout)
- **Skill cards** — User personas, sentiment breakdown, competitor switches, etc.
- **Opportunity/Pain point panels** — Top findings with direct Reddit links
- **Offline compatible** — Works without internet; fully self-contained

Features:
- Dark theme (OLED-friendly)
- Responsive design (mobile + desktop)
- Direct links back to Reddit posts for verification
- Shareable (single HTML file)

### `results.csv`

Spreadsheet with columns:
- Theme / Feature
- Category (Pain Point, Opportunity, Feature Request, etc.)
- Mention Count
- Posts (comma-separated post IDs)
- Top Quote
- Sentiment
- Quality Score

Use for:
- Comparing across multiple research topics
- Integrating with product roadmap tools
- Sharing filtered data with your team
- Pivot table analysis in Excel/Sheets

---

###  Usage Examples

### Research 1: Product Alternatives

Find pain points with existing solutions and what users want instead.

```bash
node scripts/reddit_extract.mjs \
  --topic "notion alternative" \
  --limit 100 \
  --time year

node scripts/compile_report.mjs ~/Desktop/notion-alternative_reddit_* --open
```

**Useful for**: Understanding Notion's constraints, discovering feature gaps, identifying competitor opportunities.

---

### Research 2: Small Business Problem Space

Find underserved problems in a market.

```bash
node scripts/reddit_extract.mjs \
  --topic "small business accounting" \
  --subreddits smallbusiness,entrepreneur,freelance \
  --limit 50

node scripts/compile_report.mjs ~/Desktop/small-business-accounting_reddit_* --open
```

**Useful for**: Market sizing, identifying pain points, validating problem fit.

---

### Research 3: Competitive Analysis

Understand why users switch between competitors.

```bash
node scripts/reddit_extract.mjs \
  --topic "obsidian vs roam research" \
  --limit 75 \
  --time all

# Then apply competitor-matrix skill if available
node scripts/compile_report.mjs ~/Desktop/obsidian-vs-roam-research_reddit_* --open
```

**Useful for**: Competitive positioning, feature comparison, understanding switching reasons.

---

### Research 4: Feature Validation

Find what features users most want.

```bash
node scripts/reddit_extract.mjs \
  --topic "slack features request" \
  --limit 100

# Then apply feature-request-ranking skill
node scripts/compile_report.mjs ~/Desktop/slack-features-request_reddit_* --open
```

**Useful for**: Roadmap prioritization, finding quick wins, identifying table-stakes features.

---

##  Report Customization

### Theming

Edit the CSS in [compile_report.mjs](scripts/compile_report.mjs) starting at line ~360:

```javascript
:root {
  --bg: #0d0d0d;           // Page background
  --panel: #101010;        // Card background
  --panel-soft: #151515;   // Hover background
  --ink: #f7f7f7;          // Text color
  --muted: #858585;        // Secondary text
  --line: #282828;         // Border color
  --blue: #3b8cff;         // Link color
}
```

### Grid Layout

Change grid columns:

```javascript
.themes { 
  display: grid; 
  grid-template-columns: repeat(2, minmax(0, 1fr)); // Change to 3 or 4 columns
  gap: 0; 
}
```

---

##  Configuration

### Pain Point Keywords

The extractor looks for specific keywords to identify pain points. Edit [reddit_extract.mjs](scripts/reddit_extract.mjs) line ~20:

```javascript
const PAIN_POINT_KEYWORDS = [
  "i wish", "why can't", "frustrated", "switched to", "dealbreaker",
  "missing feature", "please add", "slow", "expensive", // ... etc
];
```

### Theme Categories

Customize theme classification [reddit_extract.mjs](scripts/reddit_extract.mjs) line ~60:

```javascript
const THEME_KEYWORDS = {
  PRICING: ["expensive", "price", "cost", "cheap", "subscription"],
  PERFORMANCE: ["slow", "lag", "crash", "freeze", "speed"],
  MISSING_FEATURE: ["wish", "feature", "please add", "would love"],
  // ... add more categories
};
```

### Default Subreddits

If no subreddits specified, defaults to:

```javascript
const DEFAULT_SUBREDDITS = [
  "productivity", "software", "apps", "tech",
  "selfhosted", "nocode", "pkms"
];
```

---

##  Troubleshooting

### "Research directory not found"

**Error**: `Research directory not found: ~/Desktop/xyz_reddit_2026-05-06`

**Solution**: Make sure you ran `reddit_extract.mjs` first to create the directory. Use the exact path it outputs.

---

### "Missing raw/index.json"

**Error**: `Missing ~/Desktop/xyz_reddit_2026-05-06/raw/index.json`

**Solution**: The extraction script didn't complete successfully. Check:
- Did `reddit_extract.mjs` finish without errors?
- Is the output directory populated with `raw/` subdirectory?
- Try running extraction again with `--verbose`

---

### "Empty report"

**Problem**: Report generates but shows no posts/themes.

**Solution**:
- Increase `--limit` (default 100 posts may be too low for vague topics)
- Specify exact `--subreddits` instead of auto-discovering
- Check if topic has typos or is too niche
- Use broader time range: `--time all`

---

### All posts failing to fetch

**Problem**: "Error fetching x posts" in extraction logs.

**Solution**:
- Check internet connection
- Verify Reddit API is accessible (try browsing reddit.com manually)
- Reddit may rate-limit if fetching many posts at once
- Try smaller `--limit` or specify fewer `--subreddits`

---

##  Tips & Best Practices

###  Do's

- **Be specific with topics**: "obsidian plugins" → better results than "note-taking"
- **Target niche subreddits**: Specify `--subreddits r/obsidian,r/productivity` for better signal
- **Use time windows**: `--time month` for hot-button issues, `--time year` for sustained pain points
- **Run the full pipeline**: Extract → compile → review → export CSV for team
- **Triangulate findings**: If 3+ posts mention the same pain point, it's probably real
- **Check Reddit links**: Click through to verify quotes are in context — the HTML report has direct links

###  Don'ts

- **Don't hallucinate quotes**: Every quote is pulled directly from Reddit; no paraphrasing
- **Don't over-trust single posts**: Look for patterns across multiple posts
- **Don't skip low-upvote posts**: Sometimes the most detailed feedback comes from hidden comments
- **Don't research banned/inactive subreddits**: The extraction will fail silently
- **Don't make decisions on Reddit alone**: Combine with surveys, user interviews, analytics

---


