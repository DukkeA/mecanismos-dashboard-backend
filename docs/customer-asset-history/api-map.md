# Customer asset history API map

## Routes

- `GET /customer-asset-history/customers/:customerId`
- `GET /customer-asset-history/vehicles/:vehicleId`
- `GET /customer-asset-history/components/:componentId`

## Common query parameters

- `page` — default `1`
- `limit` — default `10`, max `100`
- `dateFrom`
- `dateTo`
- `dateField` — `createdAt | completedAt | estimatedCollectionAt`
- `status`
- `paymentStatus`
- `type`

## Behavior notes

- Customer history returns related `vehicles` and `components`.
- Vehicle history returns the owning `customer` plus related `components`.
- Component history returns the owning `customer` plus linked `vehicle` when present.
- The capability is intentionally read-only; no mutation routes exist under `/customer-asset-history/*`.
