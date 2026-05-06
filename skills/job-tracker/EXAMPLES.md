# job-tracker Examples

Example: monitor job postings matching a query and track status

Steps:

1. Provide search query and locations
2. Run the `job-tracker` skill to collect postings and update status

Example payload:

```
{
	"query": "data engineer",
	"locations": ["New York", "Remote"],
	"limit": 50
}
```

Notes: use `limit` and location filters for targeted results.
