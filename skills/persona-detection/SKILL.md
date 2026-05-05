---
name: persona-detection
description: |
  Cluster findings by user type: student, founder, engineer, creator, team lead, etc.
  Automatically identifies user personas from language patterns and context.
triggers:
  - "personas for"
  - "user types in"
  - "clusters by role"
  - "who is using"
critical_rules:
  - Persona labels must be based on direct evidence from quotes
  - Each persona cluster must include representative quotes
  - Never assign persona without explicit contextual evidence
output:
  - $OUTPUT_DIR/personas.md — clustered findings by user type
  - $OUTPUT_DIR/personas.csv — persona distribution counts
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# Persona Detection

Clusters Reddit findings by user type based on language patterns, roles, and context mentioned in posts and comments.

## Detected Personas

- **Student**: "as a CS major", "for my thesis", "in college", "working on assignments", "student discount"
- **Founder**: "my startup", "as a founder", "building my company", "YC", "seed funding"
- **Engineer**: "as an engineer", "in my codebase", "dev workflow", "API integration", "technical debt"
- **Creator**: "content creator", "YouTuber", "influencer", "my channel", "creator tools"
- **Team Lead**: "my team", "as a manager", "leading engineers", "team of", "reports to me"
- **Freelancer**: "my clients", "as a freelancer", "contractor", "gig work", "client projects"
- **Designer**: "as a designer", "Figma", "design system", "UI/UX", "pixel perfect"
- **Marketer**: "growth marketing", "as a marketer", "campaign", "conversion", "ROI"
- **Small Business**: "my small business", "local business", "shop owner", "SMB"
- **Enterprise**: "at enterprise", "large company", "Fortune 500", "corporate"

## Pipeline

1. **Extract role indicators** — scan for explicit role mentions and contextual clues
2. **Cluster by persona** — group quotes and findings by detected persona
3. **Validate with evidence** — ensure each assignment has direct quote support
4. **Identify patterns** — common pain points and needs per persona
5. **Output analysis** — persona-specific findings and recommendations

## Usage

```bash
# The persona detection runs automatically as part of theme clustering
# Or can be run standalone on extracted data
node scripts/persona-cluster.mjs $OUTPUT_DIR/raw
```

## Output Format

```markdown
## Persona Analysis — {TOPIC}

### Student (23% of mentions)
**Common context**: "for my CS thesis", "in my algorithms class", "college projects"

**Key pain points**:
- "The student discount is too limited for actual project work" (r/csstudents, 156 upvotes)
- "As a CS major I need X feature for my assignments"

**Opportunity**: Educational licensing, student-tier features

### Founder (18% of mentions)
**Common context**: "my startup", "YC batch", "seed stage"

**Key pain points**:
- "As a founder wearing all hats, I need something that just works"
- "My startup can't afford enterprise pricing yet"

**Opportunity**: Founder-friendly pricing, startup program

### Engineer (28% of mentions)
**Common context**: "in our codebase", "as an engineer", "dev workflow"

**Key pain points**:
- "API docs are terrible for actual engineering use"
- "Integration with our dev tools is non-existent"

**Opportunity**: Better API, dev tool integrations, technical documentation
```

## Key Metrics

- Persona distribution (% of total mentions)
- Top pain points per persona
- Quote count per persona cluster
- Subreddit distribution by persona
- Sentiment scores per persona type
