# Scheduler Configuration Files

This directory contains JSON configuration files for the Above Market Forecast Scheduler.

## Available Configurations

### 1. `above-market-schedule.example.json`
**Purpose:** Template with examples and documentation
**Usage:** Copy and customize for your needs

```bash
cp above-market-schedule.example.json my-custom-schedule.json
```

### 2. `above-market-schedule-fpa.json`
**Purpose:** FP&A market with default weights
**Usage:** Ready to use for FP&A daily/weekly forecasts

```bash
node schedulers/aboveMarketScheduler.js --config=configs/above-market-schedule-fpa.json
```

### 3. `above-market-schedule-mgf.json`
**Purpose:** MGF market with default weights
**Usage:** Ready to use for MGF daily/weekly forecasts

```bash
node schedulers/aboveMarketScheduler.js --config=configs/above-market-schedule-mgf.json
```

## Configuration Format

```json
{
  "marketType": "FP&A",
  "ensembleSelections": {
    "Market1": "100-0",
    "Market2": "75-25",
    "Market3": "50-50",
    "Market4": "Default"
  }
}
```

### Fields

| Field | Required | Type | Valid Values | Description |
|-------|----------|------|--------------|-------------|
| `marketType` | Yes | String | `"FP&A"` or `"MGF"` | The market type to process |
| `ensembleSelections` | No | Object | Market → Weight mapping | Ensemble weights per market |

### Valid Ensemble Weights

- `"100-0"` - 100% first model, 0% second model
- `"75-25"` - 75% first model, 25% second model
- `"50-50"` - 50% first model, 50% second model
- `"Default"` - Use default system weights

### Empty Ensemble Selections

If `ensembleSelections` is empty `{}`, all markets will use default weights:

```json
{
  "marketType": "FP&A",
  "ensembleSelections": {}
}
```

## Creating Custom Configurations

### Example 1: US Markets Only

```json
{
  "marketType": "FP&A",
  "ensembleSelections": {
    "US Northeast": "100-0",
    "US Southeast": "75-25",
    "US West": "50-50"
  }
}
```

### Example 2: Weekly Full Refresh

```json
{
  "marketType": "FP&A",
  "ensembleSelections": {
    "US": "100-0",
    "Canada": "75-25",
    "Mexico": "50-50",
    "Brazil": "Default",
    "Argentina": "Default"
  }
}
```

### Example 3: All Defaults

```json
{
  "marketType": "MGF",
  "ensembleSelections": {}
}
```

## Validation

### Check JSON Syntax

```bash
node -e "console.log(require('./configs/my-schedule.json'))"
```

### Test Configuration

```bash
node schedulers/aboveMarketScheduler.js --config=configs/my-schedule.json
```

## Best Practices

1. **Descriptive Names**: Use clear file names like `daily-fpa.json`, `weekly-mgf.json`
2. **Version Control**: Track configurations in git (not sensitive data)
3. **Documentation**: Add comments in separate .md files (JSON doesn't support comments)
4. **Testing**: Always test manually before scheduling in cron
5. **Backups**: Keep working configurations backed up

## Usage in Cron

```bash
# Daily FP&A at 2 AM
0 2 * * * cd /var/www/html/cde-ai-app-cps && node schedulers/aboveMarketScheduler.js --config=configs/above-market-schedule-fpa.json >> logs/scheduler-fpa.log 2>&1

# Weekly MGF on Sunday at 3 AM
0 3 * * 0 cd /var/www/html/cde-ai-app-cps && node schedulers/aboveMarketScheduler.js --config=configs/above-market-schedule-mgf.json >> logs/scheduler-mgf.log 2>&1
```

## See Also

- [Scheduler Guide](../SCHEDULER_GUIDE.md) - Complete documentation
- [Quick Start](../SCHEDULER_QUICK_START.md) - Quick reference
- [Summary](../SCHEDULER_SUMMARY.md) - Implementation overview
