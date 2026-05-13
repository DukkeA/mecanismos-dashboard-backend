# Auth v1 overview

Auth v1 is EMAIL/PASSWORD ONLY, keeps tokens in HttpOnly cookies, and protects admin-first backend routes with a short-lived access JWT plus refresh rotation.

Frontend implementers should start with [`frontend-recommendations.md`](./frontend-recommendations.md) for endpoint payloads and UI states.

## Quick path

1. `POST /auth/login` with email and password.
2. Let the browser or Postman keep the `md_access` and `md_refresh` cookies.
3. Call `GET /auth/me` to confirm identity.
4. Call `GET /auth/admin/smoke` only as `ADMIN`.
5. Use `POST /auth/refresh` when the access cookie expires, `POST /auth/change-password` when `mustChangePassword` is true, and `POST /auth/logout` to revoke the current refresh session.
6. Active login users may enroll a one-time recovery phrase after confirming their current password; store the returned phrase outside the app because it is never shown again.

## Endpoints at a glance

| Endpoint                               | Auth required           | Purpose                                                                                 | Success result                             |
| -------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| `POST /auth/login`                     | No                      | Validate email/password and issue cookies                                               | Current user payload + `Set-Cookie`        |
| `POST /auth/refresh`                   | Refresh cookie          | Rotate refresh session and reissue cookies                                              | Current user payload + new cookies         |
| `POST /auth/logout`                    | No hard requirement     | Revoke current refresh session if present and clear cookies                             | `{ "success": true }`                      |
| `GET /auth/me`                         | Access cookie           | Return the authenticated current user                                                   | Current user payload                       |
| `POST /auth/change-password`           | Access cookie           | Verify the current password, store a new hash, and clear forced-change state            | Current user payload                       |
| `GET /auth/recovery-phrase/status`     | Access cookie           | Report whether the current login user has a configured recovery phrase                  | Metadata only; no phrase or hash           |
| `POST /auth/recovery-phrase/generate`  | Access cookie           | Generate or rotate the current login user's recovery phrase after password confirmation | One-time plaintext 8-word English phrase   |
| `POST /auth/recovery-phrase/recover`   | No                      | Reset an active login user password using email + recovery phrase + new password        | `{ "success": true }`                      |
| `GET /auth/admin/smoke`                | Access cookie + `ADMIN` | Confirm admin-only route protection                                                     | `{ "success": true, "role": "ADMIN" }`     |
| `GET /admin/users`                     | Access cookie + `ADMIN` | List managed login users with filters                                                   | Paginated user list                        |
| `POST /admin/users`                    | Access cookie + `ADMIN` | Create a managed login user with a one-time temporary password                          | Managed user payload + `temporaryPassword` |
| `POST /admin/users/:id/reset-password` | Access cookie + `ADMIN` | Reset another user password and force a change on next login                            | Managed user payload + `temporaryPassword` |

## Current user payload

```json
{
  "id": "user-1",
  "email": "admin@mecanismos.test",
  "name": "Admin User",
  "role": "ADMIN",
  "mustChangePassword": false
}
```

## Roles

| Role       | Supported now | v1 protected focus                                    |
| ---------- | ------------- | ----------------------------------------------------- |
| `ADMIN`    | Yes           | Full auth v1 protected flows                          |
| `SALES`    | Yes           | Authenticated, but rejected by admin-only smoke route |
| `MECHANIC` | Yes           | Authenticated, but rejected by admin-only smoke route |

## What is intentionally out of scope

- OAuth or social login
- MFA
- Forgot-password email automation
- Recovery phrases for users without active login accounts
- Email verification
- Advanced RBAC beyond simple role checks

## Reviewer checklist

- [ ] Login issues `md_access` and `md_refresh` as HttpOnly cookies.
- [ ] Refresh rotates the refresh session instead of reusing it.
- [ ] `POST /auth/change-password` clears `mustChangePassword` after a valid current password.
- [ ] Logout clears cookies even if the session is already missing.
- [ ] `/auth/me` requires a valid access cookie.
- [ ] `/auth/admin/smoke` rejects authenticated `SALES` and `MECHANIC` users.
- [ ] `/admin/users` stays ADMIN-only and never leaks password hashes or refresh-token data.
- [ ] Recovery status never returns plaintext or hashes, and used/wrong phrases fail with the same generic recovery error.
- [ ] Admin password reset clears any existing user recovery phrase so old phrases cannot be reused.
- [ ] Frontend recovery and forced-password-change states follow `docs/auth/frontend-recommendations.md`.
