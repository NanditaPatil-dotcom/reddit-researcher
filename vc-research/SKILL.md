---
name: vc-research
description: |
  Research venture capital firms and investors — portfolio companies, investment
  thesis, check sizes, stage focus, and partner backgrounds. Use when you need
  to find the right investor for a startup, understand who funds a competitor,
  or map the funding landscape in a space.
  Triggers: "find investors for", "who funds", "VC research", "investor list",
  "who backed", "which VCs invest in", "fundraising research", "find angels for".
license: MIT
compatibility: Requires bb CLI and BROWSERBASE_API_KEY. Most VC sites work in local mode.
allowed-tools: Bash Agent
---

# VC Research

Research venture capital firms, investors, and funding landscapes. Extracts portfolio companies, thesis, check sizes, stage focus, and partner contact details.

**Required**: `bb` CLI + `BROWSERBASE_API_KEY`

**Output directory**: `~/Desktop/{slug}_vc_research_{YYYY-MM-DD}/`

---

## What It Extracts

### VC Firm Profile
- Investment thesis and focus areas
- Stage focus (pre-seed, seed, Series A, etc.)
- Typical check size
- Geographic focus
- Portfolio companies (full list)
- Active partners + their focus areas
- Recent investments (signals current interest)
- Portfolio exits

### Individual Investor Profile
- Current firm + role
- Past investments (personal portfolio)
- Thesis and content (tweets, blog posts)
- LinkedIn/Twitter presence
- Best contact method

---

## Data Sources

| Source | What to find | How |
|--------|-------------|-----|
| `crunchbase.com` | Funding rounds, portfolio | bb fetch |
| `pitchbook.com` | Detailed fund data | browse (JS-rendered) |
| `{firm}.com` | Thesis, team, portfolio | bb fetch / browse |
| `signal.nfx.com` | NFX portfolio signals | browse |
| Twitter/X | Partner activity + thesis | browse |
| LinkedIn | Partner backgrounds | browse (remote) |

---

## Pipeline

### Step 1: Discover Relevant VCs

```bash
# Search for VCs in your space
bb search "venture capital {SPACE} seed {LOCATION}" --num-results 15
bb search "who invests in {SPACE} startups" --num-results 10
bb search "{COMPETITOR} investors funding" --num-results 10
```

### Step 2: Research Each Firm

```bash
# Fetch firm website
node skills/fetch/scripts/fetch.mjs "{VC_WEBSITE}"

# Crunchbase profile
bb fetch --allow-redirects "https://www.crunchbase.com/organization/{FIRM_SLUG}" \
  --output /tmp/{firm}_crunchbase.json

# Extract portfolio from homepage
browse env local
browse open "{VC_WEBSITE}/portfolio"
browse wait load
browse get text "body"
browse stop
```

### Step 3: Find Partner Contacts

```bash
bb search "{FIRM_NAME} partner email contact" --num-results 5
browse open "{VC_WEBSITE}/team"
browse wait load
browse get text "body"
```

### Step 4: Check Recent Activity

```bash
# What have they invested in recently?
bb search "{FIRM_NAME} investment 2025 2026" --num-results 10

# Partner thesis (blog/tweets)
bb search "{PARTNER_NAME} investment thesis blog" --num-results 5
```

---

## Output Format

```markdown
---
firm_name: {Name}
website: {URL}
crunchbase: {URL}
stage_focus: pre-seed, seed
check_size: $250K - $2M
thesis: {1-2 sentence description}
geo_focus: US, Europe
researched_at: {ISO date}
---

## Thesis
{What they invest in, why, who for}

## Portfolio (Recent)
| Company | Stage | Year | Space |
|---------|-------|------|-------|
| {name} | Seed | 2025 | {space} |

## Partners
| Name | Focus | Contact |
|------|-------|---------|
| {name} | {focus} | {email/twitter} |

## Recent Investments (Signal)
- {Company} — {date} — {why relevant}

## Fit Assessment
**Why relevant**: {connection to your startup}
**Best partner to contact**: {name + reason}
**Warm intro path**: {mutual connection if known}
```

---

## Key Use Cases

1. **Fundraising prep** — build a targeted investor list before raising
2. **Competitive intelligence** — understand who funds your competitors
3. **Landscape mapping** — who are the key investors in a space
4. **Warm intro finding** — identify mutual connections for introductions
5. **Thesis alignment** — filter VCs whose thesis matches your startup