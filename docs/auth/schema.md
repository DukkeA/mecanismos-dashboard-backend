# Auth schema quick map

The auth schema was SIMPLIFIED IN PLACE: keep the existing `user`, `account`, and `session` tables, but reshape them for first-party email/password auth and refresh-session tracking.

## Quick path

1. Read `user` for identity and role.
2. Read `account` for the password hash.
3. Read `session` for refresh-token lineage, rotation, and revocation.

## Table decisions

| Model | v1 auth role | Fields that matter now | Why it exists |
|---|---|---|---|
| `user` | Identity and authorization | `id`, `email`, `name`, `role`, `isActive`, `mustChangePassword`, `lastLoginAt` | Drives login eligibility, forced password change, and protected-route identity |
| `account` | Password credential storage | `userId`, `passwordHash`, `passwordUpdatedAt` | Keeps the email/password credential explicit |
| `session` | Refresh-session storage | `id`, `userId`, `familyId`, `tokenDigest`, `expiresAt`, `revokedAt`, `replacedBySessionId`, `lastUsedAt`, `ipAddress`, `userAgent` | Tracks rotation, reuse detection, and logout revocation |

## Role model

| Enum | Meaning |
|---|---|
| `ADMIN` | Backend admin user; allowed on admin-only routes |
| `SALES` | Supported role scaffold; blocked from admin-only routes |
| `MECHANIC` | Supported role scaffold; blocked from admin-only routes |

## Session lineage

| Field | Meaning | Operational use |
|---|---|---|
| `tokenDigest` | SHA-256 digest of the opaque refresh token | Avoids storing raw refresh tokens |
| `familyId` | Shared identifier across rotated refresh sessions | Lets the system revoke the whole family on reuse |
| `replacedBySessionId` | Points to the next rotated session | Detects reuse of an already-rotated token |
| `revokedAt` | Explicit revocation timestamp | Used by logout and family revocation |
| `expiresAt` | Session expiry | Rejects stale refresh cookies |

## Query expectations

- `findActivePasswordCredentialByEmail(email)` returns an active user plus the password hash.
- `findActiveUserById(userId)` powers `/auth/me` after JWT validation.
- `findRefreshSessionByTokenDigest(digest)` powers refresh, reuse detection, and logout.
- `updatePasswordCredential(userId, input)` updates the bcrypt hash and clears `mustChangePassword` after a valid self-service change.

## Reviewer checklist

- [ ] Password auth depends on `passwordHash`, not OAuth leftovers.
- [ ] `mustChangePassword` starts true for admin-created or reset users and clears only after a valid password change.
- [ ] Role checks come from `user.role`.
- [ ] Refresh-session reuse can revoke the full `familyId` chain.
- [ ] Raw refresh tokens are never persisted directly.
