---
name: job-tracker
description: |
  Scrape job listings from multiple sources, normalize the data, and track
  applications. Finds open roles at target companies, extracts requirements,
  salary ranges, and hiring signals. Use to monitor hiring at a company,
  find roles matching a profile, or track your job search pipeline.
  Triggers: "find jobs at", "job listings for", "track job applications",
  "hiring at", "open roles at", "job search for", "who is hiring",
  "scrape job postings".
license: MIT
compatibility: Requires browse CLI. Most job boards work in local mode. LinkedIn Jobs requires remote mode.
allowed-tools: Bash Agent
---

# Job Tracker

Scrape job listings from multiple sources, normalize into a structured format, and maintain a searchable job pipeline. Extracts salary ranges, requirements, hiring signals, and application status.

**Output directory**: `~/Desktop/job-tracker/` (persistent pipeline)

---

## What It Extracts

### Per Job Listing
- Job title and seniority level
- Company name and size
- Location / remote policy
- Salary range (if listed)
- Required skills and years of experience
- Nice-to-have skills
- Job description (summarized)
- Application URL
- Posted date / closing date
- Hiring manager (if findable)

### Hiring Signals (per company)
- Number of open roles → growth signal
- Roles by department → which teams are expanding
- Role changes over time → track what a company is building

---

## Data Sources

| Source | Method | Notes |
|--------|--------|-------|
| Company careers pages | browse + fetch | Most reliable |
| LinkedIn Jobs | browse (remote mode) | Requires auth |
| Greenhouse / Lever / Ashby | fetch (structured) | Clean JSON available |
| Indeed / Glassdoor | browse | May need remote |
| Y Combinator jobs | fetch | `workatastartup.com` |

---

## Pipeline

### Step 1: Find Job Listings at a Company

```bash
# Check ATS directly (no browser needed — clean JSON)
# Greenhouse
curl -s "https://boards-api.greenhouse.io/v1/boards/{COMPANY_SLUG}/jobs" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    d.jobs.forEach(j => console.log(j.id, j.title, j.location?.name));
  "

# Lever
curl -s "https://api.lever.co/v0/postings/{COMPANY_SLUG}?mode=json" \
  | node -e "
    const jobs = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    jobs.forEach(j => console.log(j.text, j.categories?.location, j.hostedUrl));
  "

# Ashby
curl -s "https://jobs.ashbyhq.com/api/non-user-graphql" \
  -H "Content-Type: application/json" \
  -d '{"operationName":"ApiJobBoardWithTeams","variables":{"organizationHostedJobsPageName":"{SLUG}"},"query":"query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title departmentName locationName employmentType } } }"}'
```

### Step 2: Scrape Company Careers Page (Fallback)

```bash
browse env local
browse open "{COMPANY_URL}/careers"
browse wait load
browse wait timeout 2000
browse snapshot
browse get text "body"
browse stop
```

### Step 3: Extract Job Details

```bash
browse open "{JOB_POSTING_URL}"
browse wait load
browse get text "body"
```

Parse for:
- Salary range: `\$[\d,]+ - \$[\d,]+` or `[\d,]+K - [\d,]+K`
- Requirements: look for "Requirements", "What you'll need", "Qualifications" section
- Skills: extract tech stack mentions (React, Python, AWS, etc.)

### Step 4: LinkedIn Jobs (Remote Mode)

```bash
browse env remote   # LinkedIn needs remote mode
browse open "https://www.linkedin.com/jobs/search/?keywords={ROLE}&f_C={COMPANY_ID}"
browse wait load
browse wait timeout 3000
browse get text "body"
browse stop
```

### Step 5: Track Application Status

Maintain `~/Desktop/job-tracker/pipeline.json`:
```bash
node -e "
  const fs = require('fs');
  const pipeline = JSON.parse(fs.readFileSync('pipeline.json', 'utf8') || '[]');
  pipeline.push({
    company: '{COMPANY}',
    role: '{ROLE}',
    url: '{URL}',
    salary: '{SALARY}',
    status: 'applied',   // applied | screen | interview | offer | rejected
    applied_at: new Date().toISOString(),
    notes: '{NOTES}'
  });
  fs.writeFileSync('pipeline.json', JSON.stringify(pipeline, null, 2));
"
```

---

## Output Format

### Job Listing (`raw/{company}-{role}.md`)
```markdown
---
company: {Name}
role: {Title}
seniority: {IC1 / IC2 / Senior / Staff / Principal}
location: {City / Remote / Hybrid}
salary_min: {N}
salary_max: {N}
ats: {greenhouse / lever / ashby / custom}
url: {application URL}
posted: {date}
status: {not_applied / applied / interviewing / offer / rejected}
---

## Summary
{2-3 sentence summary of the role}

## Required Skills
- {skill} ({years} years)
- {skill}

## Nice to Have
- {skill}
- {skill}

## Stack Mentioned
{tech1}, {tech2}, {tech3}

## Red Flags / Green Flags
- ✅ {positive signal}
- 🚩 {concern}
```

### Pipeline Dashboard (`pipeline.json`)
```json
[
  {
    "company": "Acme",
    "role": "Senior Engineer",
    "salary": "$180K-$220K",
    "status": "interview",
    "applied_at": "2026-05-01",
    "next_step": "Technical round May 10"
  }
]
```

---

## Key Use Cases

1. **Job search pipeline** — track all applications in one place
2. **Hiring signal detection** — monitor a company's open roles over time
3. **Competitive intelligence** — what is competitor X hiring for?
4. **Salary research** — aggregate salary ranges across similar roles
5. **Recruiter research** — find who's hiring in your target companies