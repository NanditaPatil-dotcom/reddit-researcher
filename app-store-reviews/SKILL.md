---
name: app-store-reviews
description: |
  Scrape App Store (iOS) and Google Play Store reviews for any app. Extracts
  pain points, praise, feature requests, and competitive mentions from real
  user reviews. Use for PMF research, competitive analysis, or understanding
  what mobile users actually complain about.
  Triggers: "app store reviews for", "google play reviews", "mobile app feedback",
  "what do users say about {app}", "app reviews research", "iOS reviews for",
  "Play Store analysis".
license: MIT
compatibility: Requires browse CLI. App Store works in local mode. Google Play may need remote mode. iTunes Search API is free and keyless.
allowed-tools: Bash Agent
---

# App Store Reviews

Scrape iOS App Store and Google Play reviews to extract pain points, praise, and feature requests from real mobile users. Combines public APIs with browser automation for full coverage.

**No API keys required** for App Store (uses iTunes API). Google Play requires browse.

**Output directory**: `~/Desktop/{slug}_reviews_{YYYY-MM-DD}/`

---

## What It Extracts

### Review Data
- Rating (1-5 stars)
- Review title and body
- Username and date
- Version reviewed
- Developer response (if any)

### Aggregated Signals
- Rating distribution (1★ vs 5★ %)
- Most common words in negative reviews
- Feature requests extracted from reviews
- Competitor mentions ("switched from X", "better than Y")
- Churn signals ("cancelling", "uninstalling", "requesting refund")

---

## Data Sources

| Platform | Source | Method |
|----------|--------|--------|
| iOS App Store | iTunes RSS API + browse | Free, no auth |
| Google Play | play.google.com browse | browse required |
| App ratings | iTunes Search API | Free |

---

## Pipeline

### Step 1: Find App IDs

```bash
# iOS — search iTunes API
APP_NAME="{APP_NAME}"
curl -s "https://itunes.apple.com/search?term=${APP_NAME// /+}&entity=software&limit=5" \
  | node -e "
    const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    r.results.forEach(a => console.log(a.trackId, a.trackName, a.averageUserRating));
  "

# iOS — get app details
APP_ID="{IOS_APP_ID}"
curl -s "https://itunes.apple.com/lookup?id=${APP_ID}" \
  | node -e "
    const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const a = r.results[0];
    console.log(a.trackName, a.averageUserRating, a.userRatingCount);
  "
```

### Step 2: Fetch App Store Reviews (RSS Feed)

```bash
# iOS App Store RSS — up to 500 most recent reviews
COUNTRY="us"
curl -s "https://itunes.apple.com/${COUNTRY}/rss/customerreviews/page=1/id=${APP_ID}/sortby=mostrecent/json" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const reviews = d.feed?.entry || [];
    reviews.forEach(r => {
      if (!r.id || !r.content) return;
      console.log(JSON.stringify({
        rating: r['im:rating']?.label,
        title: r.title?.label,
        body: r.content?.label,
        author: r.author?.name?.label,
        date: r.updated?.label,
        version: r['im:version']?.label
      }));
    });
  "

# Get pages 2-5 (each page has ~50 reviews)
for PAGE in 2 3 4 5; do
  curl -s "https://itunes.apple.com/${COUNTRY}/rss/customerreviews/page=${PAGE}/id=${APP_ID}/sortby=mostrecent/json"
  sleep 1
done
```

### Step 3: Google Play Reviews

```bash
browse env local
browse open "https://play.google.com/store/apps/details?id={PACKAGE_NAME}&showAllReviews=true"
browse wait load
browse wait timeout 2000

# Sort by newest
browse snapshot
# find sort dropdown ref and click "Newest"
browse click @0-{sort_ref}
browse wait timeout 1500

# Scroll to load more
for i in 1 2 3 4 5; do
  browse scroll 500 500 0 1500
  browse wait timeout 1000
done

browse get text "body"
browse stop
```

### Step 4: Analyze Reviews

Filter by rating:
- **1-2 star**: pain points, churn reasons, bugs
- **3 star**: mixed signals, missing features
- **4-5 star**: love signals, what to preserve

Extract:
```bash
# Keyword frequency analysis from reviews
node -e "
  const reviews = require('./reviews.json');
  const keywords = ['crash', 'slow', 'bug', 'love', 'great', 'expensive', 'switched', 'missing', 'wish', 'please add'];
  const counts = {};
  keywords.forEach(k => counts[k] = reviews.filter(r => r.body.toLowerCase().includes(k)).length);
  console.log(JSON.stringify(counts, null, 2));
"
```

---

## Output Format

```markdown
---
app_name: {Name}
ios_app_id: {ID}
play_package: {com.example.app}
ios_rating: {N}/5 ({N} ratings)
play_rating: {N}/5 ({N} ratings)
reviews_analyzed: {N}
researched_at: {ISO date}
---

## Rating Distribution
| Stars | iOS | Google Play |
|-------|-----|-------------|
| ★★★★★ | {N}% | {N}% |
| ★★★★☆ | {N}% | {N}% |
| ★★★☆☆ | {N}% | {N}% |
| ★★☆☆☆ | {N}% | {N}% |
| ★☆☆☆☆ | {N}% | {N}% |

## Top Pain Points (1-2★ Reviews)
- "{review excerpt}" — {date}, {platform}
- "{review excerpt}" — {date}, {platform}

## Top Praise (4-5★ Reviews)
- "{review excerpt}" — {date}, {platform}

## Feature Requests (from reviews)
| Feature | Mentions | Example Quote |
|---------|----------|---------------|
| {feature} | {N} | "..." |

## Competitor Mentions
- {App name}: mentioned {N} times (switched to/from)

## Churn Signals
- "Uninstalling because..." — {N} mentions
- "Cancelling subscription because..." — {N} mentions
```

---

## Key Use Cases

1. **PMF research** — what do users of competing apps actually want?
2. **Competitive intelligence** — where do competitor users get frustrated?
3. **Feature validation** — are users asking for what you're building?
4. **Churn analysis** — why do people uninstall or cancel?
5. **Copy research** — what language do real users use to describe the problem?