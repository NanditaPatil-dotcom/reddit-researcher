---
name: composio-crm-sync
description: |
  Sync research findings, company data, and contact information directly into
  HubSpot or Pipedrive using Composio. Takes structured output from research
  skills (company-research, linkedin-researcher, reddit-researcher) and creates
  or updates CRM records — companies, contacts, deals, and notes — automatically.
  Triggers: "add to CRM", "sync to HubSpot", "update Pipedrive", "push findings
  to CRM", "save contacts to HubSpot", "log research to CRM", "create deal in".
license: MIT
compatibility: Requires Composio (composio-core). Connect HubSpot or Pipedrive via `composio add hubspot` or `composio add pipedrive`.
allowed-tools: Bash Agent
---

# Composio CRM Sync

Sync research findings and contact data into HubSpot or Pipedrive using Composio's managed integrations. No OAuth setup — Composio handles auth for both CRMs.

**Required**:
```bash
pip install composio-core composio-claude
composio login
composio add hubspot      # or: composio add pipedrive
```

---

## What It Does

Takes structured data (from company-research, linkedin-researcher, or manual input) and:

- Creates or updates **Company** records
- Creates or updates **Contact** records
- Creates **Deals** with stage and value
- Logs **Notes** with research summaries
- Associates contacts to companies and deals

---

## Available Composio Actions

### HubSpot
| Action | What it does |
|--------|-------------|
| `HUBSPOT_CREATE_COMPANY` | Create a new company record |
| `HUBSPOT_UPDATE_COMPANY` | Update existing company fields |
| `HUBSPOT_CREATE_CONTACT` | Create a new contact |
| `HUBSPOT_UPDATE_CONTACT` | Update existing contact |
| `HUBSPOT_CREATE_DEAL` | Create a deal in a pipeline |
| `HUBSPOT_CREATE_NOTE` | Log a note on a record |
| `HUBSPOT_SEARCH_CONTACTS` | Find existing contacts |
| `HUBSPOT_SEARCH_COMPANIES` | Find existing companies |

### Pipedrive
| Action | What it does |
|--------|-------------|
| `PIPEDRIVE_CREATE_ORGANIZATION` | Create a new organization |
| `PIPEDRIVE_CREATE_PERSON` | Create a contact |
| `PIPEDRIVE_CREATE_DEAL` | Create a deal |
| `PIPEDRIVE_ADD_NOTE` | Log a note |
| `PIPEDRIVE_SEARCH_ITEM` | Search existing records |

---

## Pipeline

### Step 1: Setup Composio

```bash
pip install composio-core composio-claude
composio login
composio add hubspot    # follow OAuth flow (one time)

# Verify connection
composio connections
```

### Step 2: Prepare Research Data

This skill expects structured input — typically the output of company-research or linkedin-researcher:

```python
research = {
    "company_name": "Acme Inc",
    "website": "https://acme.com",
    "industry": "SaaS",
    "employee_estimate": "50-100",
    "icp_fit_score": 8,
    "icp_fit_reasoning": "Series A, uses Selenium, expanding to EU",
    "contacts": [
        {
            "name": "Jane Doe",
            "title": "VP Engineering",
            "email": "jane@acme.com",
            "linkedin": "linkedin.com/in/janedoe"
        }
    ],
    "research_summary": "Acme builds AI inventory management for e-commerce brands..."
}
```

### Step 3: Create Company Record

```python
from composio_claude import ComposioToolSet, App, Action

toolset = ComposioToolSet()

# Check if company already exists
existing = toolset.execute_action(
    action=Action.HUBSPOT_SEARCH_COMPANIES,
    params={"query": research["company_name"], "limit": 1}
)

if not existing["data"]["results"]:
    # Create new company
    company = toolset.execute_action(
        action=Action.HUBSPOT_CREATE_COMPANY,
        params={
            "name": research["company_name"],
            "domain": research["website"].replace("https://", "").replace("www.", ""),
            "industry": research["industry"],
            "numberofemployees": research["employee_estimate"],
            "description": research["research_summary"][:500]
        }
    )
    company_id = company["data"]["id"]
else:
    company_id = existing["data"]["results"][0]["id"]
```

### Step 4: Create Contact Records

```python
for contact in research.get("contacts", []):
    existing_contact = toolset.execute_action(
        action=Action.HUBSPOT_SEARCH_CONTACTS,
        params={"query": contact["email"] or contact["name"], "limit": 1}
    )

    if not existing_contact["data"]["results"]:
        toolset.execute_action(
            action=Action.HUBSPOT_CREATE_CONTACT,
            params={
                "firstname": contact["name"].split()[0],
                "lastname": " ".join(contact["name"].split()[1:]),
                "jobtitle": contact["title"],
                "email": contact.get("email", ""),
                "hs_linkedin_bio": contact.get("linkedin", "")
            }
        )
```

### Step 5: Log Research Note

```python
toolset.execute_action(
    action=Action.HUBSPOT_CREATE_NOTE,
    params={
        "hs_note_body": f"""
Research Summary — {research['company_name']}
ICP Fit Score: {research['icp_fit_score']}/10
Reasoning: {research['icp_fit_reasoning']}

{research['research_summary']}

Researched: {datetime.now().strftime('%Y-%m-%d')}
        """.strip(),
        "hs_timestamp": int(datetime.now().timestamp() * 1000),
        "associations": [{"to": {"id": company_id}, "types": [{"category": "HUBSPOT_DEFINED", "typeId": 190}]}]
    }
)
```

### Step 6: Create Deal (Optional)

```python
if research["icp_fit_score"] >= 7:
    toolset.execute_action(
        action=Action.HUBSPOT_CREATE_DEAL,
        params={
            "dealname": f"{research['company_name']} — Outbound",
            "dealstage": "appointmentscheduled",   # adjust to your pipeline
            "pipeline": "default",
            "amount": "",
            "closedate": ""
        }
    )
```

---

## Full Script

```python
#!/usr/bin/env python3
# composio_crm_sync.py — sync research findings to HubSpot
# Usage: python composio_crm_sync.py --input company_research.json --crm hubspot

import json
import argparse
from datetime import datetime
from composio_claude import ComposioToolSet, Action

def sync_to_hubspot(research: dict):
    toolset = ComposioToolSet()

    print(f"Syncing {research['company_name']} to HubSpot...")

    # 1. Find or create company
    existing = toolset.execute_action(
        action=Action.HUBSPOT_SEARCH_COMPANIES,
        params={"query": research["company_name"], "limit": 1}
    )

    if existing["data"]["results"]:
        company_id = existing["data"]["results"][0]["id"]
        print(f"  Company exists (ID: {company_id}), updating...")
        toolset.execute_action(
            action=Action.HUBSPOT_UPDATE_COMPANY,
            params={"companyId": company_id, "properties": {"description": research.get("research_summary", "")}}
        )
    else:
        result = toolset.execute_action(
            action=Action.HUBSPOT_CREATE_COMPANY,
            params={
                "name": research["company_name"],
                "domain": research.get("website", "").replace("https://", "").replace("www.", ""),
                "industry": research.get("industry", ""),
                "description": research.get("research_summary", "")[:500]
            }
        )
        company_id = result["data"]["id"]
        print(f"  Created company (ID: {company_id})")

    # 2. Log research note
    toolset.execute_action(
        action=Action.HUBSPOT_CREATE_NOTE,
        params={
            "hs_note_body": f"ICP Score: {research.get('icp_fit_score', 'N/A')}/10\n\n{research.get('icp_fit_reasoning', '')}\n\n{research.get('research_summary', '')}",
            "hs_timestamp": int(datetime.now().timestamp() * 1000)
        }
    )
    print("  Note logged ✓")

    # 3. Create deal if strong fit
    if research.get("icp_fit_score", 0) >= 7:
        toolset.execute_action(
            action=Action.HUBSPOT_CREATE_DEAL,
            params={
                "dealname": f"{research['company_name']} — Outbound",
                "dealstage": "appointmentscheduled",
                "pipeline": "default"
            }
        )
        print("  Deal created ✓")

    print(f"  Done: {research['company_name']}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--crm", default="hubspot", choices=["hubspot", "pipedrive"])
    args = parser.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    companies = data if isinstance(data, list) else [data]
    for company in companies:
        sync_to_hubspot(company)
```

---

## Key Use Cases

1. **Research → CRM pipeline** — run company-research, push all findings to HubSpot automatically
2. **LinkedIn → CRM** — research a person on LinkedIn, create contact + note in CRM
3. **Reddit pain points → deal notes** — log user pain points as CRM notes for context during sales calls
4. **Batch import** — sync 50+ researched companies from a JSON file in one run
5. **Enrichment** — update existing CRM records with fresh research data