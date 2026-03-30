---
name: Signal normalization rules
description: Maps Bridgewise SignalWise JSON (nested eventMetadata/assetsDetails/eventContent) to internal Signal format
type: feature
---

## Real Bridgewise SignalWise Format

Messages arrive with 5 garbage bytes prefix (schema registry). Strip to first `{`.

```json
{
  "eventMetadata": {
    "uniqueEventId": "uuid",
    "eventName": "Price Event",
    "eventType": "PriceBreaks52WeekHighAlert",
    "eventDate": "2025-09-04 10:15:23.412000 UTC",
    "eventSentiment": "Positive",
    "eventImportanceLevel": 1
  },
  "eventContent": {
    "es-ES": { "eventTitle": "...", "eventBody": "..." },
    "en-US": { "eventTitle": "...", "eventBody": "..." }
  },
  "alertEvidences": {
    "assetTriggerPrice": 178.3,
    "assetThresholdPrice": 177.9,
    "assetChangePercent": 4.8
  },
  "assetsDetails": {
    "assetId": 100010,
    "tickerSymbol": "GOOGL",
    "tickerExchange": "NASDAQ",
    "assetName": "Alphabet Inc. (Google)",
    "assetNameShort": "Google",
    "assetType": "Stock",
    "currency": "USD"
  }
}
```

## Mapping to internal Signal

| Internal field | Source |
|---|---|
| id | eventMetadata.uniqueEventId |
| timestamp | eventMetadata.eventDate |
| symbol | assetsDetails.tickerSymbol > assetNameShort > assetName |
| action | eventMetadata.eventSentiment (Positive→BUY, Negative→SELL) |
| confidence | eventMetadata.eventImportanceLevel |
| eventName | eventMetadata.eventName |
| eventType | eventMetadata.eventType |
| title | eventContent["es-ES"].eventTitle (es > en > any) |
| description | eventContent["es-ES"].eventBody |

Topic: `alerts-reasoning-external` (all asset classes)
