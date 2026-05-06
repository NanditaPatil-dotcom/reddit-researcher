# Browser Skills and App intergration

A collection of AI agent skills powered by browser automation and app integrations. Each skill is a self-contained module that uses the `browse` CLI or a lightweight "connect" plugin to accomplish research, data-extraction, and workflow automation tasks.

**Built for**: Claude agents, AI workflows, and anyone building browser-powered or app-integrated automation.

---

## What Are Skills?

Each skill is a folder containing:
- `SKILL.md` — what the skill does, how to use it, input/output format
- `scripts/` — executable Node.js scripts (where applicable)
- `EXAMPLES.md` — usage examples (where applicable)

Skills are modular and composable — use one standalone or chain multiple together.

---

## Available Skills

### Core Browser Infrastructure
| Skill | Description | Powered by |
|-------|-------------|-----------|
| [browser](skills/browser/) | Automate browser interactions — navigate, click, fill forms, extract content | browser |
| [fetch](skills/fetch/) | Fetch page HTML/JSON without a full browser session | browser |
| [search](skills/search/) | Search the web and return structured results | browser |

### Research & Intelligence
| Skill | Description | Powered by |
|-------|-------------|-----------|
| [company-research](skills/company-research/) | Discover and deeply research companies, score ICP fit, generate outreach | browser |
| [reddit-researcher](skills/reddit-researcher/) | Mine subreddits for pain points, PMF signals, and user feedback | browser |
| [linkedin-researcher](skills/linkedin-researcher/) | Research people and companies on LinkedIn — roles, career history, signals | browser |
| [vc-research](skills/vc-research/) | Find investors, portfolio companies, thesis, and check sizes | browser |
| [hacker-news-digest](skills/hacker-news-digest/) | Surface top HN threads on any topic, extract signal from comments | browser |
| [product-hunt-scout](skills/product-hunt-scout/) | Track new launches, upvote trends, and founder/user comments | browser |
| [glassdoor-analyzer](skills/glassdoor-analyzer/) | Scrape company reviews, salary data, and culture signals | browser |
| [github-tracker](skills/github-tracker/) | Monitor repos, issues, PRs, contributors, and star growth | browser |

### Market & Competitive Intelligence
| Skill | Description | Powered by |
|-------|-------------|-----------|
| [app-store-reviews](skills/app-store-reviews/) | Scrape App Store and Google Play reviews for pain points and praise | browser |
| [price-monitor](skills/price-monitor/) | Monitor product prices across sites, detect changes and drops | browser |
| [news-aggregator](skills/news-aggregator/) | Collect and cluster news coverage on any topic from multiple sources | browser |

### Job & Talent
| Skill | Description | Powered by |
|-------|-------------|-----------|
| [job-tracker](skills/job-tracker/) | Scrape job listings, normalize data, track applications | browser |

### App Integrations
| Skill | Description |
|-------|-------------|
| [crm-sync](skills/crm-sync/) | Sync research findings directly into HubSpot or Pipedrive |
| [github-agent](skills/github-agent/) | Create issues, PRs, and comments on GitHub from agent findings |
| [outreach-agent](skills/outreach-agent/) | Draft and send personalized outreach via Gmail or Slack |

---

## Two Ways to Build Skills

### 1. Browser Skills
Use the `browse` CLI to automate real browser interactions — navigate pages, extract content, fill forms.

```bash
npm install -g @browserbasehq/browse-cli
browse open "https://example.com"
browse get text "body"
browse stop
```

Best for: scraping, research, monitoring, any task that requires reading a webpage.

### 2. Connect / App Automation
Use a small "connect" plugin or connector to let skills perform real actions — send emails, create issues, post to Slack, and interact with many apps using managed auth.

```bash
# Example: install or configure a connector plugin
pip install connect-plugin-example
connect-plugin setup
```

Best for: writing back to apps, sending emails, creating issues, updating CRMs, posting to Slack.

---

## Quick Start

### Browser Skill (Reddit Research)
```bash
node skills/reddit-researcher/scripts/reddit_extract.mjs --topic "notion alternative"
node skills/reddit-researcher/scripts/compile_report.mjs ~/Desktop/reddit-research --open
```

### Connector Skill (CRM Sync)
```bash
# Example: install a connector runtime or plugin to enable connector-backed skills
pip install connector-runtime connector-claude
connector login
connector add hubspot

# Then ask Claude to run the crm-sync skill
```

---

## Skill Structure

```
skills/
└── skill-name/
    ├── SKILL.md          # Required — description, triggers, input/output, pipeline
    ├── scripts/          # Optional — runnable scripts
    │   └── main.mjs
    ├── EXAMPLES.md       # Optional — usage examples
    └── LICENSE.txt       # License
```

### SKILL.md Frontmatter

```yaml
---
name: skill-name
description: |
        What the skill does and when to use it.
        Triggers: "keywords that activate this skill"
license: MIT
compatibility: What's required (browse CLI / connect / both)
allowed-tools: Bash
---
```

---

## Composing Skills

Skills are designed to be chained. Example pipeline:

```
reddit-researcher → company-research → crm-sync
        ↓
Mine pain points → Research target companies → Push to CRM
```

Or for competitive monitoring:
```
product-hunt-scout → app-store-reviews → outreach-agent
         ↓
 Track launches  →  Read reviews  →  Send Slack digest to team
```

---

## Adding a New Skill

1. Create `skills/your-skill-name/`
2. Write `SKILL.md` following the format above
3. Add scripts to `scripts/` if needed
4. Add an entry to the README table
5. Submit a PR

---

## Credits

Browser automation powered by [Browserbase](https://browserbase.com).
App integrations powered by connector plugins and connector runtimes.

