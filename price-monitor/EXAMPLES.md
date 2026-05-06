# price-monitor Examples

Example: monitor product price and send alerts when below a threshold

Steps:

1. Provide product URL and target price
2. Run the `price-monitor` skill to fetch current price and compare

Example payload:

```
{
	"url": "https://store.example.com/product/123",
	"target_price": 49.99
}
```

Notes: run periodically to detect price drops.
