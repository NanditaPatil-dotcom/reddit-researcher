# crm-sync Examples

Example: sync a contact from an external source into the CRM

Steps:

1. Provide contact data and mapping configuration
2. Call the `crm-sync` skill to upsert the contact and return status

Example JSON payload:

```
{
	"action": "upsert_contact",
	"crm": "example-crm",
	"mapping": {
		"firstName": "first_name",
		"lastName": "last_name",
		"email": "email",
		"company": "employer"
	},
	"record": {
		"first_name": "Jane",
		"last_name": "Doe",
		"email": "jane.doe@example.com",
		"employer": "ExampleCorp"
	}
}
```

Example: fetch changes since a timestamp

```
{
	"action": "fetch_changes",
	"crm": "example-crm",
	"since": "2026-05-01T00:00:00Z",
	"limit": 100
}
```

Notes: ensure `crm-sync` has valid credentials for the target CRM and that mappings
match the CRM field names. Use `upsert_contact` to create or update by unique email.

