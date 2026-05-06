# Inventory procurement API map

## Inventory

- `GET /inventory-items`
- `POST /inventory-items`
- `GET /inventory-items/:id`
- `GET /inventory-items/:id/movements`
- `POST /inventory-items/:id/movements`
- `GET /inventory-movements/:id`

## Quote lookup

- `GET /inventory-items/:id/supplier-quotes`
- `GET /suppliers/:id/quotes`
- `POST /supplier-quotes`
- `PATCH /supplier-quotes/:id`
- `PATCH /supplier-quotes/:id/void`
