---
name: linkedin-researcher
description: |
  Research people and companies on LinkedIn using browser automation.
  Given a name, company, or job title — extracts role history, skills,
  mutual connections, recent posts, and company signals. Use when you need
  to understand a person's background before outreach, find decision-makers
  at a company, or map an org chart.
  Triggers: "research person on LinkedIn", "find decision maker at",
  "LinkedIn profile for", "who leads X at Y", "org chart for",
  "background on", "find contact at".
license: MIT
compatibility: Requires browse CLI and BROWSERBASE_API_KEY. LinkedIn requires remote mode (Browserbase) for anti-bot stealth.
allowed-tools: Bash Agent
---

# LinkedIn Researcher

Research people and companies on LinkedIn — extract role history, skills, recent activity, and company org signals using browser automation.

**Required**: `browse` CLI + `BROWSERBASE_API_KEY` (LinkedIn blocks local browsers — always use remote mode)

**Output directory**: `~/Desktop/{slug}_linkedin_{YYYY-MM-DD}/`

---

## What It Extracts

### Person Profile
- Current role and company
- Previous roles (last 3-5 positions with dates)
- Education
- Skills (top 10)
- Recent posts and activity
- Mutual connections (if logged in)
- Contact info (if visible)

### Company Page
- Headcount and recent growth
- Recent hires by department
- Key people (leadership, decision-makers)
- Recent company posts and announcements
- Job openings (signals team growth)

---

## Pipeline

### Step 1: Setup

```bash
browse env remote   # REQUIRED — LinkedIn blocks local browsers
OUTPUT_DIR=~/Desktop/{slug}_linkedin_$(date +%Y-%m-%d)
mkdir -p "$OUTPUT_DIR"
```

### Step 2: Search for Profile

```bash
browse open "https://www.linkedin.com/search/results/people/?keywords={NAME}+{COMPANY}"
browse wait load
browse snapshot   # find profile links
```

Or search Google first (avoids LinkedIn login walls on search):

```bash
bb search "site:linkedin.com/in {NAME} {COMPANY}" --num-results 5
# pick the most relevant URL
```

### Step 3: Open Profile

```bash
browse open "{LINKEDIN_PROFILE_URL}"
browse wait load
browse wait timeout 2000
browse snapshot
browse get text "body"
```

Extract:
- Name, headline, location
- Current position + company
- Experience section (scroll to load all)
- Education section
- Skills section

### Step 4: Scroll to Load Full Profile

LinkedIn lazy-loads sections:

```bash
browse scroll 500 500 0 1000   # scroll down
browse wait timeout 1500
browse snapshot                 # check if more sections loaded
browse scroll 500 500 0 1000   # scroll more
browse get text "body"          # get full text
```

### Step 5: Company Page (optional)

```bash
browse open "https://www.linkedin.com/company/{COMPANY_SLUG}"
browse wait load
browse snapshot
browse get text "body"
```

Extract:
- Employee count
- Recent posts
- "People also viewed" (similar companies)

---

## Output Format

```markdown
---
name: {Full Name}
linkedin_url: {URL}
current_role: {Title} at {Company}
location: {City, Country}
researched_at: {ISO date}
---

## Current Role
- **Title**: {title}
- **Company**: {company}
- **Duration**: {start} – present ({N} years)

## Experience
| Role | Company | Duration |
|------|---------|----------|
| {title} | {company} | {start} – {end} |
| ... | ... | ... |

## Education
- {Degree}, {School} ({year})

## Top Skills
{skill1}, {skill2}, {skill3}, ...

## Recent Activity
- "{Post excerpt}" — {date}

## Outreach Notes
{Personalization hook based on research}
```

---

## Anti-Detection Rules

- Always use `browse env remote` — never local mode for LinkedIn
- Add `browse wait timeout 2000` after every page load
- Don't open more than 20 profiles per session
- If you see a CAPTCHA or "Let's do a quick security check": stop, `browse stop`, wait 60s, retry

---

## Key Use Cases

1. **Pre-call research** — understand someone's background before a sales call
2. **Decision-maker mapping** — find the right person to contact at a company
3. **Org chart building** — map leadership at a target company
4. **Hiring signal detection** — recent job posts reveal company priorities
5. **Outreach personalization** — use recent posts/career moves as conversation openers