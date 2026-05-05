---
name: csv-schema-enforcement
description: |
  Define exact columns so reports are easier to compare across topics.
  Standardizes output format for automated processing and dashboards.
triggers:
  - "standardize reports"
  - "CSV schema for"
  - "consistent columns"
  - "dashboard format"
critical_rules:
  - Schema must be strictly enforced on all outputs
  - Column names must be consistent across all topics
  - Data types must be validated
output:
  - $OUTPUT_DIR/enforced_schema.csv — standardized report
  - $OUTPUT_DIR/schema_definition.json — column definitions and types
required_tools:
  - browse CLI (free)
  - bb search (free)
license: MIT
compatibility: Public subreddits only — no API keys required
---

# CSV Schema Enforcement

Defines and enforces a standard column structure for all research reports, ensuring consistency for comparison and dashboarding.

## Standard Schema Columns

| Column Name | Type | Description | Example |
|-------------|------|-------------|----------|
| topic | string | Research topic | "Notion alternatives" |
| date | date | Research date | "2024-01-15" |
| subreddit | string | Source subreddit | "r/productivity" |
| post_id | string | Reddit post ID | "abc123" |
| post_url | string | Full Reddit URL | "https://reddit.com/r/..." |
| post_title | string | Post title | "Why I left Notion" |
| post_upvotes | integer | Post upvote count | 234 |
| comment_id | string | Comment ID (if applicable) | "def456" |
| comment_text | text | Full comment text | "I switched because..." |
| comment_upvotes | integer | Comment upvotes | 89 |
| author | string | Reddit username | "user123" |
| category | string | Theme category | "COMPETITOR_SWITCH" |
| sentiment | string | Sentiment label | "FRUSTRATION" |
| sentiment_score | float | Sentiment intensity (1-5) | 4.2 |
| persona | string | User persona | "engineer" |
| mention_count | integer | Times mentioned | 12 |
| is_churn_signal | boolean | Indicates churn | true |
| competitive_tool | string | Competitor mentioned | "Airtable" |
| switch_direction | string | TO/FROM | "FROM" |
| quote_quality | string | Evidence quality | "HIGH" |
| evidence_source | string | Source type | "comment" |
| extracted_date | datetime | Extraction timestamp | "2024-01-15 14:30:00" |

## Schema Enforcement Rules

### Required Columns (always present)
- topic, date, subreddit, post_id, post_url, extract_date

### Conditional Columns
- comment_id, comment_text, comment_upvotes (only for comment-level data)
- persona, sentiment (only when those analyses are run)
- competitive_tool, switch_direction (only for competitor matrix)

### Data Validation
- **topic**: Non-empty string, max 200 chars
- **date**: ISO 8601 format (YYYY-MM-DD)
- **post_upvotes**: Integer >= 0
- **sentiment_score**: Float between 1.0 and 5.0
- **is_churn_signal**: Boolean (true/false)
- **post_url**: Valid Reddit URL pattern
- **category**: Must match predefined list

## Pipeline

1. **Extract raw data** — standard reddit extraction pipeline
2. **Transform to schema** — map all fields to standard columns
3. **Validate data types** — check each column against rules
4. **Fill defaults** — empty strings for text, 0 for counts, false for booleans
5. **Export CSV** — UTF-8 encoded, comma-separated, quoted fields
6. **Generate JSON schema** — documentation of structure

## Usage

```bash
# Schema enforcement runs automatically during report generation
# Generate schema-compliant CSV
node scripts/enforce-schema.mjs $OUTPUT_DIR/raw --output $OUTPUT_DIR/enforced_schema.csv

# Validate existing CSV against schema
node scripts/validate-schema.mjs $OUTPUT_DIR/data.csv --schema schema_definition.json
```

## Output Format

```csv
topic,date,subreddit,post_id,post_url,post_title,post_upvotes,comment_id,comment_text,category,sentiment,persona,is_churn_signal,competitive_tool
notion_alternatives,2024-01-15,r/productivity,abc123,https://reddit.com/r/productivity/comments/abc123,Why I left Notion,234,def456,"The UI is too confusing and I switched to Airtable",COMPETITOR_SWITCH,FRUSTRATION,engineer,true,Airtable
notion_alternatives,2024-01-15,r/startups,xyz789,https://reddit.com/r/startups/comments/xyz789,PM tools for small team,89,,"We need better task dependencies",MISSING_FEATURE,,founder,false,
```

## Schema Definition (JSON)

```json
{
  "schema_name": "reddit_research_standard",
  "version": "1.0.0",
  "description": "Standardized schema for Reddit research output",
  "columns": [
    {
      "name": "topic",
      "type": "string",
      "required": true,
      "max_length": 200,
      "description": "Research topic"
    },
    {
      "name": "sentiment_score",
      "type": "float",
      "required": false,
      "min_value": 1.0,
      "max_value": 5.0,
      "description": "Sentiment intensity (1-5)"
    }
  ]
}
```

## Key Benefits

- **Comparison**: Easy comparison across different topics/time periods
- **Automation**: Standard format for ETL pipelines and dashboards
- **Integration**: Compatible with BI tools (Tableau, PowerBI, Looker)
- **Quality**: Validation ensures data consistency
- **Scalability**: Handles any research topic with same structure
