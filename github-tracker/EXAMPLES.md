# github-tracker Examples

Example: track issue and PR activity across repositories

Steps:

1. Provide organization and list of repositories
2. Run the `github-tracker` skill to collect recent issues/PRs and summaries

Example payload:

```
{
	"org": "example-org",
	"repos": ["repo1", "repo2"],
	"since": "2026-01-01"
}
```

Notes: use `since` to limit the time window.
