# Auth v1 overview

Auth v1 is EMAIL/PASSWORD ONLY, keeps tokens in HttpOnly cookies, and protects admin-first backend routes with a short-lived access JWT plus refresh rotation.

## Quick path

1. `POST /auth/login` with email and password.
2. Let the browser or Postman keep the `md_access` and `md_refresh` cookies.
3. Call `GET /auth/me` to confirm identity.
4. Call `GET /auth/admin/smoke` only as `ADMIN`.
5. Use `POST /auth/refresh` when the access cookie expires, then `POST /auth/logout` to revoke the current refresh session.

## Endpoints at a glance

| Endpoint | Auth required | Purpose | Success result |
|---|---|---|---|
| `POST /auth/login` | No | Validate email/password and issue cookies | Current user payload + `Set-Cookie` |
| `POST /auth/refresh` | Refresh cookie | Rotate refresh session and reissue cookies | Current user payload + new cookies |
| `POST /auth/logout` | No hard requirement | Revoke current refresh session if present and clear cookies | `{ "success": true }` |
| `GET /auth/me` | Access cookie | Return the authenticated current user | Current user payload |
| `GET /auth/admin/smoke` | Access cookie + `ADMIN` | Confirm admin-only route protection | `{ "success": true, "role": "ADMIN" }` |

## Current user payload

```json
{
  "id": "user-1",
  "email": "admin@mecanismos.test",
  "name": "Admin User",
  "role": "ADMIN"
}
```

## Roles

| Role | Supported now | v1 protected focus |
|---|---|---|
| `ADMIN` | Yes | Full auth v1 protected flows |
| `SALES` | Yes | Authenticated, but rejected by admin-only smoke route |
| `MECHANIC` | Yes | Authenticated, but rejected by admin-only smoke route |

## What is intentionally out of scope

- OAuth or social login
- MFA
- Password reset
- Email verification
- Advanced RBAC beyond simple role checks

## Reviewer checklist

- [ ] Login issues `md_access` and `md_refresh` as HttpOnly cookies.
- [ ] Refresh rotates the refresh session instead of reusing it.
- [ ] Logout clears cookies even if the session is already missing.
- [ ] `/auth/me` requires a valid access cookie.
- [ ] `/auth/admin/smoke` rejects authenticated `SALES` and `MECHANIC` users.
