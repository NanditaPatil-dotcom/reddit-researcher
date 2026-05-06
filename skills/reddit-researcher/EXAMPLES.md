# reddit-researcher Examples

Example: collect recent posts and user data for a subreddit

Steps:

1. Provide a subreddit name and optional search query
2. Run the `reddit-researcher` skill to retrieve posts and metadata

Example payload:

```
{
  "subreddit": "example_subreddit",
  "query": "data analysis",
  "limit": 25
}
```

Notes: adjust `limit` and `query` to narrow or expand results.
