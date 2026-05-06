---
name: glassdoor-analyzer
description: |
  Scrape Glassdoor for company reviews, salary data, interview experiences,
  and culture signals. Use to understand a company's internal culture before
  joining, research a prospect's engineering team, or find hiring pain points
  for sales outreach.
  Triggers: "glassdoor reviews for", "company culture at", "salary data for",
  "what's it like to work at", "interview process at", "employee sentiment at",
  "company review research".
license: MIT
compatibility: Requires browse CLI and BROWSERBASE_API_KEY. Glassdoor has bot protection — always use remote mode.
allowed-tools: Bash Agent
---

# Glassdoor Analyzer

Scrape Glassdoor for company reviews, salary data, interview experiences, and culture signals. Structured for competitive intelligence, hiring research, and sales outreach personalization.

**Required**: `browse` CLI + `BROWSERBASE_API_KEY` (Glassdoor has strong bot detection — remote mode required)

**Output directory**: `~/Desktop/{slug}_glassdoor_{YYYY-MM-DD}/`

---

## What It Extracts

### Company Overview
- Overall rating (out of 5)
- Rating breakdown: Culture, Work/Life Balance, Management, Compensation, Career Growth
- CEO approval rating
- Recommend to a friend %
- Recent rating trend (improving/declining)

### Reviews
- Top positive reviews (what employees praise)
- Top critical reviews (pain points, churn reasons)
- Most mentioned pros and cons
- Management-specific complaints

### Salary Data
- Roles with salary ranges
- Compensation by seniority level
- Location-based salary variations

### Interview Data
- Difficulty rating
- Common interview questions
- Process length and stages
- Offer rate

---

## Pipeline

### Step 1: Find Company on Glassdoor

```bash
browse env remote   # REQUIRED — Glassdoor blocks local browsers

# Search Google first to get the exact Glassdoor URL
bb search "site:glassdoor.com {COMPANY_NAME} reviews" --num-results 3
# Pick the reviews URL: glassdoor.com/Reviews/{company}-Reviews-{ID}.htm
```

### Step 2: Open Reviews Page

```bash
browse open "https://www.glassdoor.com/Reviews/{COMPANY_SLUG}-Reviews-{ID}.htm"
browse wait load
browse wait timeout 3000   # Glassdoor is slow
browse snapshot
browse get text "body"
```

Extract from page:
- Overall rating
- Rating breakdown by category
- Recent reviews (title + pros + cons + date)

### Step 3: Load More Reviews

```bash
# Sort by recent
browse click @0-{sort_dropdown_ref}    # find ref from snapshot
browse snapshot
browse click @0-{most_recent_ref}
browse wait load
browse get text "body"

# Click "Show More" to load additional reviews
browse click @0-{show_more_ref}
browse wait timeout 2000
browse get text "body"
```

### Step 4: Salary Data

```bash
browse open "https://www.glassdoor.com/Salary/{COMPANY_SLUG}-Salaries-{ID}.htm"
browse wait load
browse get text "body"
```

### Step 5: Interview Data

```bash
browse open "https://www.glassdoor.com/Interview/{COMPANY_SLUG}-Interview-Questions-{ID}.htm"
browse wait load
browse get text "body"
```

---

## Output Format

```markdown
---
company: {Name}
glassdoor_url: {URL}
overall_rating: {N}/5
total_reviews: {N}
researched_at: {ISO date}
---

## Ratings Breakdown
| Category | Score |
|----------|-------|
| Culture & Values | {N}/5 |
| Work/Life Balance | {N}/5 |
| Senior Management | {N}/5 |
| Compensation & Benefits | {N}/5 |
| Career Opportunities | {N}/5 |

**CEO Approval**: {N}%
**Recommend to Friend**: {N}%

## Top Pros (What Employees Love)
- "{Pro quote}" — {role}, {date}
- "{Pro quote}" — {role}, {date}

## Top Cons (Pain Points)
- "{Con quote}" — {role}, {date}
- "{Con quote}" — {role}, {date}

## Salary Ranges
| Role | Level | Salary Range |
|------|-------|-------------|
| Software Engineer | Senior | ${min}K – ${max}K |
| Product Manager | Mid | ${min}K – ${max}K |

## Interview Insights
- **Difficulty**: {Easy/Medium/Hard} ({N}% rating)
- **Process**: {description of stages}
- **Common Questions**:
  - "{question}"
  - "{question}"

## Culture Signals
| Signal | Finding |
|--------|---------|
| Management quality | {assessment} |
| Engineering culture | {assessment} |
| Remote/hybrid | {policy} |
| Growth opportunities | {assessment} |
```

---

## Key Use Cases

1. **Job research** — understand a company's culture before applying
2. **Sales intelligence** — find pain points to personalize outreach ("we saw your engineers rate management 2.1/5...")
3. **Competitive talent analysis** — is your competitor's team happy or about to leave?
4. **Hiring research** — understand what candidates care about at competitors
5. **Culture benchmarking** — compare ratings across companies in a space