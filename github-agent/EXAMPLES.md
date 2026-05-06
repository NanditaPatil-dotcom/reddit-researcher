# github-agent Examples

Example: automate GitHub operations (issues, PRs, labels) via the agent

Steps:

1. Provide repository identifier(s) and desired action(s)
2. Run the `github-agent` skill to perform the action and return results

Example payloads:

Create an issue:

```
{
  "action": "create_issue",
  "repo": "example-org/repo",
  "title": "Bug: unexpected crash",
  "body": "Steps to reproduce..."
}
```

List open PRs:

```
{
  "action": "list_prs",
  "repo": "example-org/repo",
  "state": "open",
  "limit": 20
}
```

Notes: ensure the agent has appropriate GitHub credentials and repository access.
