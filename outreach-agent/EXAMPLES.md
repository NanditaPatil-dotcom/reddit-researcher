```markdown
# outreach-agent Examples

Example: compose and send a personalized outreach message

Steps:

1. Provide contact info and personalization variables
2. Run the `outreach-agent` skill with `compose_message` to generate a message
3. Optionally run `send_message` or `send_sequence` with `channel` and rate limits

Example payload: compose a single message

```
{
	"action": "compose_message",
	"contact": {
		"name": "Alex Johnson",
		"email": "alex@example.com",
		"company": "Acme Co",
		"title": "Head of Growth"
	},
	"template": "intro",
	"personalization": {
		"pain_point": "scaling user acquisition",
		"mutual_connection": "Sam Lee"
	},
	"tone": "concise",
	"max_tokens": 300
}
```

Example payload: compose + send with follow-up sequence

```
{
	"action": "send_sequence",
	"sequence": [
		{
			"step": 1,
			"action": "compose_message",
			"template": "intro",
			"delay_days": 0
		},
		{
			"step": 2,
			"action": "compose_message",
			"template": "followup_1",
			"delay_days": 3
		},
		{
			"step": 3,
			"action": "compose_message",
			"template": "followup_2",
			"delay_days": 7
		}
	],
	"contact": {
		"name": "Alex Johnson",
		"email": "alex@example.com"
	},
	"channel": "email",
	"rate_limit_per_hour": 20
}
```

Example payload: batch personalize from CSV

```
{
	"action": "batch_compose",
	"source": "contacts.csv",
	"mapping": {
		"name": "Full Name",
		"email": "Email",
		"company": "Company",
		"title": "Title"
	},
	"template": "intro",
	"output": "messages.jsonl"
}
```

Notes: respect sending limits and privacy; validate emails before sending; use conservative `rate_limit_per_hour` to avoid spam flags; test templates on a sample contact first.

```
