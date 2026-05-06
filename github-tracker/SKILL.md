---
name: github-tracker
description: |
  Monitor GitHub repositories — track stars, forks, issues, PRs, contributors,
  and release history. Extracts signals about project health, community size,
  and contributor activity. Use for competitive intelligence on open source tools,
  tracking a dependency, or researching a company's engineering output.
  Triggers: "github stats for", "track repo", "github research on", "repo health",
  "open source intelligence", "who contributes to", "github stars for",
  "monitor github repo".
license: MIT
compatibility: Requires bb CLI. GitHub's public API works without auth for basic data (60 req/hr). Add GITHUB_TOKEN for 5000 req/hr.
allowed-tools: Bash Agent
---

# GitHub Tracker

Monitor GitHub repositories and extract project health signals, contributor data, issue trends, and competitive intelligence. Uses GitHub's public REST API — no browser required for most data.

**Optional**: Set `GITHUB_TOKEN` for higher rate limits (5000 req/hr vs 60)

**Output directory**: `~/Desktop/{slug}_github_{YYYY-MM-DD}/`

---

## What It Extracts

### Repository Stats
- Stars, forks, watchers, open issues
- Star growth over time (is momentum increasing?)
- License, language breakdown
- Last commit date (is it actively maintained?)

### Community Health
- Number of contributors
- Top contributors (by commits)
- PR merge rate and response time
- Issue resolution rate and time

### Release History
- Recent releases and changelog
- Release frequency (how often do they ship?)
- Version progression

### Code Signals
- Primary language
- Recent commit activity (commits per week)
- Open vs closed issues ratio
- PR open vs merged ratio

---

## Data Sources

GitHub REST API (no auth needed for public repos):

| Endpoint | Data |
|----------|------|
| `/repos/{owner}/{repo}` | Stars, forks, watchers, language |
| `/repos/{owner}/{repo}/contributors` | Contributor list + commit count |
| `/repos/{owner}/{repo}/releases` | Release history |
| `/repos/{owner}/{repo}/commits` | Recent commit activity |
| `/repos/{owner}/{repo}/issues` | Open issues + labels |
| `/repos/{owner}/{repo}/pulls` | PR status |
| `/repos/{owner}/{repo}/stargazers` | Star count (paginated) |

---

## Pipeline

### Step 1: Basic Repo Stats

```bash
OWNER="{owner}"
REPO="{repo}"
AUTH_HEADER=""
[ -n "$GITHUB_TOKEN" ] && AUTH_HEADER="-H 'Authorization: Bearer $GITHUB_TOKEN'"

curl -s $AUTH_HEADER \
  "https://api.github.com/repos/${OWNER}/${REPO}" \
  | node -e "
    const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(JSON.stringify({
      stars: r.stargazers_count,
      forks: r.forks_count,
      watchers: r.watchers_count,
      open_issues: r.open_issues_count,
      language: r.language,
      created: r.created_at,
      updated: r.updated_at,
      license: r.license?.name,
      description: r.description
    }, null, 2));
  "
```

### Step 2: Contributors

```bash
curl -s "https://api.github.com/repos/${OWNER}/${REPO}/contributors?per_page=20" \
  | node -e "
    const c = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    c.forEach(x => console.log(x.contributions, x.login));
  "
```

### Step 3: Recent Releases

```bash
curl -s "https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=10" \
  | node -e "
    const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    r.forEach(x => console.log(x.tag_name, x.published_at, x.name));
  "
```

### Step 4: Issue Health

```bash
# Open issues
curl -s "https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=20"

# Closed issues (for resolution rate)
curl -s "https://api.github.com/repos/${OWNER}/${REPO}/issues?state=closed&per_page=20"
```

### Step 5: Commit Frequency

```bash
curl -s "https://api.github.com/repos/${OWNER}/${REPO}/stats/commit_activity" \
  | node -e "
    const w = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const recent = w.slice(-12);   // last 12 weeks
    const avg = recent.reduce((s,x) => s+x.total, 0) / recent.length;
    console.log('Avg commits/week (last 12w):', avg.toFixed(1));
  "
```

---

## Output Format

```markdown
---
repo: {owner}/{repo}
url: https://github.com/{owner}/{repo}
stars: {N}
forks: {N}
contributors: {N}
researched_at: {ISO date}
---

## Repository Health

| Metric | Value | Signal |
|--------|-------|--------|
| Stars | {N} | {growing/flat/declining} |
| Forks | {N} | {assessment} |
| Open Issues | {N} | {healthy/high} |
| Last Commit | {date} | {active/stale} |
| Release Cadence | {N}/month | {frequent/slow} |
| Avg Commits/Week | {N} | {active/declining} |

## Top Contributors
| Username | Commits | Company |
|----------|---------|---------|
| {username} | {N} | {company if known} |

## Recent Releases
| Version | Date | Key Changes |
|---------|------|-------------|
| {tag} | {date} | {summary} |

## Issue Trends
- Open: {N} | Closed: {N} | Resolution rate: {N}%
- Common issue labels: {label1}, {label2}
- Avg time to close: {N} days

## Competitive Assessment
| Signal | Assessment |
|--------|------------|
| Project health | Active / Declining / Abandoned |
| Community size | Large / Medium / Small |
| Enterprise ready | Yes / No / Unknown |
| Commercial backing | {company or OSS} |
```

---

## Key Use Cases

1. **Open source competitive intel** — how healthy is the competing OSS project?
2. **Dependency tracking** — is this library actively maintained?
3. **Engineering signal for sales** — "we saw you contribute to {repo}..."
4. **Hiring research** — find engineers who contribute to relevant projects
5. **Build vs buy** — is the OSS alternative worth betting on?