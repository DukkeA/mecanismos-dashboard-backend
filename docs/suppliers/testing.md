# Suppliers testing guide

## Automated tests

Use these focused commands from repo root:

```bash
npm run test:e2e -- test/suppliers/suppliers.e2e-spec.ts
npm run test -- src/suppliers/suppliers.artifacts.spec.ts
node -e "JSON.parse(require('node:fs').readFileSync('test/postman/mecanismos-dashboard-suppliers.postman_collection.json', 'utf8')); console.log('suppliers postman json ok')"
```

## What each layer proves

| Layer | Files | Why it matters |
| --- | --- | --- |
| E2E | `test/suppliers/suppliers.e2e-spec.ts` | Verifies auth cookies, `ADMIN | SALES` access, `MECHANIC` rejection, DTO validation, `404`, duplicate-name acceptance, multi-phone responses, and primary normalization. |
| Artifact | `src/suppliers/suppliers.artifacts.spec.ts` | Verifies reviewer docs and Postman artifacts ship with the slice. |

## Postman workflow

Use `test/postman/mecanismos-dashboard-suppliers.postman_collection.json` for reviewer-friendly checks.

Before manual verification:

```bash
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Collection Runner order

1. Import the collection.
2. Confirm `baseUrl` matches the local Nest app.
3. Run the **Runner Happy Path** folder.
4. Run the **Protection & Error Checks** folder.

### What the collection automates

- Logs in as the seeded `ADMIN` user.
- Creates a supplier with multiple phones and captures `supplierId` from the real create response.
- Reuses that captured `supplierId` for list/search/get/update requests.
- Confirms duplicate supplier names are accepted.
- Verifies `400` invalid payload, `401` after logout, and `403` for a seeded `MECHANIC` user.
