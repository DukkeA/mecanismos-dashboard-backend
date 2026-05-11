# App settings validation rules

## Payload rules

- `currencyCode` must be a trimmed 3-letter uppercase code.
- `monthlyWorkingHours` must stay between `1` and `744`.
- `defaultLaborHourlyRate` must be an integer greater than or equal to `0`.
- `saleContingencyPct`, `workshopContingencyPct`, and `diagnosticContingencyPct` must stay between `0` and `100`.
- `minimumMarkupPct`, `recommendedMarkupPct`, and `highMarkupPct` must stay between `0` and `1000`.

## Behavioral rules

- Missing singleton data is self-healed from deterministic defaults.
- Invalid updates do not mutate the persisted singleton.
- Existing estimate snapshots do not change just because the singleton changed later.
