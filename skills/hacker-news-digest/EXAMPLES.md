# hacker-news-digest Examples

Example: create a daily digest of top Hacker News posts with summaries

Steps:

1. Provide time window and number of items
2. Run the `hacker-news-digest` skill to fetch, summarize and rank posts

Example payload:

```
{
	"time_window": "24h",
	"limit": 10
}
```

Notes: set `limit` to control digest length.
