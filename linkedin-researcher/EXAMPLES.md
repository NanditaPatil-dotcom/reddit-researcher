# linkedin-researcher Examples

Example: extract public LinkedIn profiles and key role information

Steps:

1. Provide a person name, company, or profile URL
2. Run the `linkedin-researcher` skill to fetch profile summary, roles, and contact signals

Example payload: search by name + company

```
{
  "action": "search_profiles",
  "query": "Jane Doe",
  "company": "ExampleCorp",
  "limit": 10
}
```

Example payload: fetch a single profile by URL

```
{
  "action": "fetch_profile",
  "profile_url": "https://www.linkedin.com/in/jane-doe-12345/"
}
```

Notes: respect LinkedIn's terms of service and rate limits; use public profile URLs when available. Adjust `limit` to control number of matches.
