# news-aggregator Examples

Example: aggregate news articles for a topic across selected sources

Steps:

1. Provide a topic or query and optional sources
2. Run the `news-aggregator` skill to collect, dedupe and summarize articles

Example payload:

```
{
	"query": "AI funding",
	"sources": ["techcrunch", "theverge"],
	"limit": 20
}
```

Notes: supply source list to restrict crawls.
