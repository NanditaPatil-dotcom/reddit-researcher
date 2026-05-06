---
name: composio-outreach-agent
description: |
  Draft and send personalized outreach emails via Gmail or team digests via Slack
  using Composio. Takes research output (company-research, linkedin-researcher,
  reddit-researcher) and composes context-aware messages — cold emails, follow-ups,
  Slack digests, or internal research summaries — then sends them directly.
  Triggers: "send outreach to", "email about", "slack digest for", "draft cold email",
  "send research summary", "notify team about", "send follow-up to".
license: MIT
compatibility: Requires Composio (composio-core). Connect Gmail via `composio add gmail` and/or Slack via `composio add slack`.
allowed-tools: Bash Agent
---

# Composio Outreach Agent

Draft and send personalized outreach via Gmail or team digests via Slack using Composio's managed integrations. Pairs with research skills to close the loop from finding → messaging.

**Required**:
```bash
pip install composio-core composio-claude
composio login
composio add gmail    # connect Gmail (one time OAuth)
composio add slack    # connect Slack (one time OAuth)
```

---

## What It Does

- **Sends cold emails** personalized from LinkedIn or company research
- **Posts Slack digests** — weekly research summaries to a channel
- **Sends follow-up emails** based on previous interaction context
- **Drafts to Gmail** without sending (for human review first)
- **DMs individuals** on Slack with research findings

---

## Available Composio Actions

### Gmail
| Action | What it does |
|--------|-------------|
| `GMAIL_SEND_EMAIL` | Send an email immediately |
| `GMAIL_CREATE_EMAIL_DRAFT` | Save to drafts (for review before sending) |
| `GMAIL_FETCH_EMAILS` | Read inbox / search emails |
| `GMAIL_REPLY_TO_THREAD` | Reply to an existing thread |
| `GMAIL_LIST_THREADS` | List email threads |

### Slack
| Action | What it does |
|--------|-------------|
| `SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL` | Post to a channel |
| `SLACK_LIST_CHANNELS` | List available channels |
| `SLACK_SCHEDULE_MESSAGE_TO_CHANNEL` | Schedule a future message |
| `SLACK_FETCH_CONVERSATION_HISTORY` | Read channel history |

---

## Pipeline

### Step 1: Setup Composio

```bash
pip install composio-core composio-claude
composio login
composio add gmail
composio add slack

# Verify connections
composio connections
```

### Step 2: Send Personalized Cold Email

```python
from composio_claude import ComposioToolSet, Action

toolset = ComposioToolSet()

# Research data (from linkedin-researcher or company-research output)
contact = {
    "name": "Jane Doe",
    "first_name": "Jane",
    "email": "jane@acmeinc.com",
    "title": "VP Engineering",
    "company": "Acme Inc",
    "recent_activity": "just posted about scaling their data pipeline",
    "pain_point": "mentioned struggling with observability at scale",
    "your_value_prop": "we help engineering teams get full-stack observability in under a day"
}

email_body = f"""Hi {contact['first_name']},

Saw your post about scaling Acme's data pipeline — the observability challenge you mentioned is exactly what we help teams solve.

{contact['your_value_prop'].capitalize()}.

Would it make sense to chat for 15 minutes to see if there's a fit?

Best,
[Your Name]"""

toolset.execute_action(
    action=Action.GMAIL_SEND_EMAIL,
    params={
        "recipient_email": contact["email"],
        "subject": f"Observability for Acme's pipeline — quick question",
        "body": email_body
    }
)
print(f"Email sent to {contact['name']} at {contact['email']}")
```

### Step 3: Save as Draft First (Safer)

```python
# For review before sending — saves to Gmail Drafts
toolset.execute_action(
    action=Action.GMAIL_CREATE_EMAIL_DRAFT,
    params={
        "recipient_email": contact["email"],
        "subject": f"Re: {contact['company']} — quick note",
        "body": email_body
    }
)
print("Draft saved — review in Gmail before sending")
```

### Step 4: Post Weekly Research Digest to Slack

```python
from datetime import datetime

# Digest from reddit-researcher or news-aggregator output
digest = {
    "topic": "notion alternative",
    "week": datetime.now().strftime("%b %d, %Y"),
    "top_pain_points": [
        "Offline mode — 23 mentions (up from 14 last week)",
        "Pricing — 17 mentions, 3 viral complaint threads",
        "Performance — 15 mentions, mostly mobile"
    ],
    "top_opportunities": [
        "Web clipper: multiple 'looking for' posts with no good answer",
        "Non-US alternative: geopolitical concern thread, 400+ upvotes"
    ],
    "competitor_mentions": ["Obsidian (positive, 31)", "Logseq (positive, 18)", "Craft (mixed, 12)"]
}

slack_message = f"""
:bar_chart: *Reddit Research Digest — {digest['topic']}* | {digest['week']}

*Top Pain Points This Week*
{chr(10).join(f"• {p}" for p in digest['top_pain_points'])}

*Opportunities*
{chr(10).join(f"• {o}" for o in digest['top_opportunities'])}

*Competitor Mentions*
{chr(10).join(f"• {c}" for c in digest['competitor_mentions'])}

_Full report: ~/Desktop/reddit-research/index.html_
""".strip()

toolset.execute_action(
    action=Action.SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL,
    params={
        "channel": "product-research",   # your channel name
        "text": slack_message
    }
)
print("Digest posted to #product-research")
```

### Step 5: Use with Claude as the Agent (Full Loop)

```python
from anthropic import Anthropic
from composio_claude import ComposioToolSet, App

client = Anthropic()
toolset = ComposioToolSet()

# Give Claude both Gmail and Slack tools
tools = toolset.get_tools(apps=[App.GMAIL, App.SLACK])

research = open("company_research.json").read()

messages = [{
    "role": "user",
    "content": f"""
You are an outreach agent. Based on the research below, do the following:
1. Draft a personalized cold email for each contact found (save as Gmail draft, don't send)
2. Post a one-paragraph summary of the findings to the Slack channel #sales-intel

Research:
{research}
"""
}]

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    tools=tools,
    messages=messages
)

# Agentic loop — let Claude use tools until done
while response.stop_reason == "tool_use":
    tool_results = toolset.handle_tool_calls(response)
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": tool_results})
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        tools=tools,
        messages=messages
    )

print(response.content[0].text)
```

---

## Batch Outreach from Research Output

```python
import json

# Load contacts from company-research output
with open("~/Desktop/company_research/contacts.json") as f:
    contacts = json.load(f)

# Filter by ICP fit score
qualified = [c for c in contacts if c.get("icp_fit_score", 0) >= 7]

print(f"Sending outreach to {len(qualified)} qualified contacts...")

for contact in qualified:
    body = f"""Hi {contact['first_name']},

{contact['personalization_hook']}

{contact['value_prop']}

Worth a quick chat?

Best"""

    # Save as draft — human reviews before send
    toolset.execute_action(
        action=Action.GMAIL_CREATE_EMAIL_DRAFT,
        params={
            "recipient_email": contact["email"],
            "subject": contact["suggested_subject"],
            "body": body
        }
    )
    print(f"  Draft created: {contact['name']} at {contact['company']}")

print("Done. Review drafts in Gmail before sending.")
```

---

## Example Pipelines

### Full Research → Outreach Loop
```
linkedin-researcher (find person + background)
        ↓
company-research (score ICP fit, find pain points)
        ↓
composio-crm-sync (create HubSpot contact + deal)
        ↓
composio-outreach-agent (create Gmail draft with personalization)
        ↓
Human reviews draft → sends
```

### Weekly Reddit Digest to Team
```
reddit-researcher (run every Monday)
        ↓
composio-outreach-agent (post to #product-research Slack channel)
        ↓
Team gets structured digest without manual work
```

---

## Key Use Cases

1. **Personalized cold outreach** — use LinkedIn research to write emails that reference real context
2. **Weekly research digests** — auto-post Reddit/HN findings to team Slack channels
3. **Sales enablement** — create Gmail drafts for reps to review and send
4. **Internal alerts** — Slack-notify team when competitor launches something significant
5. **Follow-up sequences** — check Gmail for replies, draft contextual follow-ups