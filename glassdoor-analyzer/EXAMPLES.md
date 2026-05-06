# glassdoor-analyzer Examples

Example: analyze Glassdoor reviews for employer sentiment and themes

Steps:

1. Provide a company name or Glassdoor URL
2. Run the `glassdoor-analyzer` skill to extract reviews and summarize themes

Example payload:

```
{
	"company": "ExampleCorp",
	"limit": 200
}
```

Notes: increase `limit` for broader coverage; filter by role if needed.
