---
name: landing-page-copy-generator
description: |
  Turn real user phrases into headline/value-prop/testimonial-style copy.
  Extracts compelling marketing language from authentic user feedback.
triggers:
  - "landing page copy for"
  - "headlines from"
  - "testimonials from"
  - "value proposition"
critical_rules:
  - All copy must derive from actual user quotes
  - Original source URLs must be cited for each piece of copy
  - Never modify or embellish user language
  - Group copy by use case/theme
output:
  - $OUTPUT_DIR/landing_page_copy.md — headlines, value props, testimonials
  - $OUTPUT_DIR/copy_by_use_case.csv — structured copy library
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# Landing Page Copy Generator

Transforms authentic user phrases into marketing copy for landing pages: headlines, value propositions, testimonials, and feature descriptions.

## Copy Types

### Headlines (H1/H2)
Bite-sized impact statements derived from user pain/solution statements:
- Max 10-12 words
- Problem → Solution or Benefit-focused
- High-emotion or high-specificity

### Value Propositions
Core benefit statements that explain what users gain:
- 1-2 sentences
- Specific outcome or relief
- Derived from repeat user themes

### Testimonials
Direct user quotes formatted for landing page display:
- Verbatim quotes only
- Attribution (subreddit, role if known)
- Context preserved

### Feature Descriptions
User-language explanations of why features matter:
- Problem → Feature → Outcome structure
- Based on actual use cases mentioned

## Pipeline

1. **Extract impactful phrases** — high-upvote quotes, strong emotion, clear outcomes
2. **Categorize by use case** — problem/solution/benefit type
3. **Adapt for format** — shorten for headlines, contextualize for testimonials
4. **Group by theme** — pricing, features, UX, competitive advantages
5. **Output copy library** — ready-to-use marketing copy with sources

## Usage

```bash
# Copy generation runs as part of report compilation
# Can regenerate copy for specific use cases
node scripts/generate-copy.mjs $OUTPUT_DIR --format landing-page
```

## Output Format

```markdown
# Landing Page Copy — {TOPIC}

## Headlines (H1)

### Primary Headline Options
1. **"Finally, a {TOPIC} that doesn't make you want to quit"**  
   Source: User quote "I was about to quit until I found this" (r/productivity, 234 upvotes)

2. **"{TOPIC} that actually works for {persona}"**  
   Source: "As an engineer, I need {TOPIC} that just works" (r/tech, 167 upvotes)

### Secondary Headlines (H2)

1. **"Stop {pain_point}. Start {benefit}."**  
   Sources:  
   - "I was tired of {pain_point}" (r/...)
   - "Now I can {benefit} without hassle" (r/...)

## Value Propositions

### For {Persona}
**"{TOPIC} helps {persona} {achieve_outcome} without {common_pain}"**  
Derived from: Multiple user mentions of {pain} blocking {outcome}

### Competitive Advantage
**"Unlike {competitor}, {TOPIC} {key_differentiator}"**  
Derived from: User switch stories citing this as the reason

## Testimonials

### {Use Case} Success
> "{Exact user quote about success}"  
> — u/username, r/subreddit ({upvotes} upvotes)

### Pain Point Solved
> "{Exact user quote about problem being solved}"  
> — u/username, {user_persona}, r/subreddit

## Feature Descriptions

### {Feature Name}
**"{Feature} means you can {user_benefit} — no more {user_pain}"**  
Based on {count}+ user mentions of this specific benefit

### {Feature Name}
**"Finally, {feature} that {user_desired_outcome}"**  
Direct from user feedback: "{quote_snippet}"
```

## CSV Copy Library

```csv
copy_type,headline,value_prop,testimonial,source_url,use_case,theme,upvotes,persona
headline,"Finally, a {TOPIC}...","","","r/productivity...,landing_page,engagement,234,engineer
testimonial,"",,">\"Finally something that works...\"","r/tech...",sales_page,reliability,156,founder
```

## Copy Categories

### Problem → Solution
User pain stated clearly → Your solution
- Best for hero sections
- High conversion for pain-aware audiences

### Competitive Edge
What competitor lacks → What you provide  
- Best for comparison pages
- Effective for switchers

### Outcome Focused
Desired result → How you deliver it
- Best for feature pages
- Appeals to benefit-seekers

### Social Proof
What others achieved → You can too
- Best for testimonial sections
- Builds trust and credibility

## Key Metrics

- Total usable quotes for copy
- Copy variations by category
- Average sentiment of source quotes
- Most-quoted features/pain points
- Persona distribution in source quotes
