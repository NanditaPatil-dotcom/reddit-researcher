---
name: price-monitor
description: |
  Monitor product prices across websites and detect changes, drops, or restocks.
  Supports single URL monitoring, multi-site comparison, and periodic checking.
  Use to track competitor pricing, monitor SaaS plan changes, or get alerts
  when a product drops in price.
  Triggers: "monitor price of", "track price changes", "price drop alert",
  "competitor pricing", "when does X go on sale", "price comparison for",
  "SaaS pricing changes".
license: MIT
compatibility: Requires browse CLI. Most e-commerce works in local mode. Use remote for sites with bot detection (Amazon, etc.).
allowed-tools: Bash Agent
---

# Price Monitor

Monitor product prices across websites — detect changes, drops, and competitor pricing shifts. Supports one-time snapshots and periodic monitoring with change detection.

**Output directory**: `~/Desktop/price-monitor/` (persistent across runs)

---

## What It Tracks

### Product Pricing
- Current price
- Original/strikethrough price
- Discount percentage
- Stock status (in stock / out of stock / limited)
- Sale end date (if shown)

### SaaS Pricing Pages
- Plan names and prices
- Feature limits per plan
- Annual vs monthly toggle
- Hidden fees or add-ons

### Price History
- Price at each check (timestamped)
- % change from last check
- All-time high/low since monitoring started

---

## Pipeline

### Step 1: One-Time Price Snapshot

```bash
# Try fetch first (faster, no browser)
bb fetch --allow-redirects "{PRODUCT_URL}" --output /tmp/page.json
# Parse price from HTML

# Or use browse for JS-rendered pages (most e-commerce)
browse env local
browse open "{PRODUCT_URL}"
browse wait load
browse wait timeout 2000
browse snapshot
browse get text "body"
browse stop
```

Extract price with regex patterns:
```bash
node -e "
  const html = require('fs').readFileSync('/tmp/page_content.txt', 'utf8');
  const patterns = [
    /\\\$[\d,]+\.?\d*/g,           // \$29.99
    /USD\s*[\d,]+\.?\d*/g,        // USD 29
    /[\d,]+\.?\d*\s*\/\s*mo/g,    // 29/mo
    /price[\"']?\s*:\s*[\d.]+/gi  // JSON price field
  ];
  patterns.forEach(p => {
    const matches = html.match(p);
    if (matches) console.log(p.toString(), '->', matches.slice(0, 3));
  });
"
```

### Step 2: SaaS Pricing Page

```bash
browse env local
browse open "{SAAS_URL}/pricing"
browse wait load
browse wait timeout 1500
browse get text "body"   # get all plan names, prices, features
browse stop
```

### Step 3: Multi-Site Price Comparison

```bash
URLS=(
  "https://site1.com/product"
  "https://site2.com/product"
  "https://site3.com/product"
)

for URL in "${URLS[@]}"; do
  browse open "$URL"
  browse wait load
  browse get text "body" >> /tmp/all_prices.txt
  echo "---URL: $URL---" >> /tmp/all_prices.txt
  sleep 2
done
```

### Step 4: Periodic Monitoring

Save snapshot to file and compare:
```bash
SNAPSHOT_FILE=~/Desktop/price-monitor/{slug}_history.json

# Read existing history
HISTORY=$(cat "$SNAPSHOT_FILE" 2>/dev/null || echo "[]")

# Add new price point
node -e "
  const history = JSON.parse('$HISTORY');
  const newEntry = { price: {CURRENT_PRICE}, timestamp: new Date().toISOString(), url: '{URL}' };
  history.push(newEntry);

  // Detect change
  if (history.length > 1) {
    const prev = history[history.length - 2].price;
    const curr = newEntry.price;
    const change = ((curr - prev) / prev * 100).toFixed(1);
    if (Math.abs(change) > 0) console.log('PRICE CHANGED:', change + '%', prev, '->', curr);
  }

  require('fs').writeFileSync('$SNAPSHOT_FILE', JSON.stringify(history, null, 2));
"
```

---

## Output Format

### Single Snapshot
```markdown
---
url: {URL}
product: {name}
checked_at: {ISO datetime}
---

## Current Price
- **Price**: \${N}
- **Original**: \${N} (if on sale)
- **Discount**: {N}% off
- **Stock**: In Stock / Out of Stock

## Price Context
- Sale ends: {date if shown}
- Shipping: {cost if shown}
- Seller: {marketplace seller if applicable}
```

### Price History (JSON)
```json
[
  { "price": 29.99, "timestamp": "2026-05-01T10:00:00Z", "stock": "in_stock" },
  { "price": 24.99, "timestamp": "2026-05-06T10:00:00Z", "stock": "in_stock", "change": "-16.7%" }
]
```

### SaaS Pricing Comparison
```markdown
## {Company} Pricing — {date}

| Plan | Monthly | Annual | Key Limits |
|------|---------|--------|------------|
| Free | \$0 | \$0 | {limits} |
| Pro | \${N}/mo | \${N}/yr | {limits} |
| Team | \${N}/mo | \${N}/yr | {limits} |
| Enterprise | Custom | Custom | Unlimited |

## Changes Since Last Check
- **{Plan}**: \${old} → \${new} ({change}%)
- New plan added: {name}
```

---

## Key Use Cases

1. **Competitive pricing** — track when competitors change their SaaS pricing
2. **Deal hunting** — monitor a product URL until price drops
3. **Restock alerts** — check stock status periodically
4. **Market research** — compare pricing across multiple vendors
5. **Procurement** — track software pricing for budget planning