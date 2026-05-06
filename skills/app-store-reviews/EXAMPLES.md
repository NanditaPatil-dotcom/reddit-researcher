# app-store-reviews Examples

Example: summarize recent app reviews for sentiment and key issues

Steps:

1. Provide an app identifier or app store URL
2. Run the `app-store-reviews` skill to fetch latest reviews and analyze

Example payload:

```
{
  "app_id": "com.example.app",
  "limit": 50
}
```

Notes: adjust `limit` and filter by rating to focus analysis.
