# Auth frontend recommendations

Use the auth API as a cookie-first browser flow: submit credentials, let the browser keep HttpOnly cookies, read `/auth/me`, and guide users through password change plus recovery phrase onboarding when needed.

## Quick happy path

1. Login with `POST /auth/login`.
2. Read `mustChangePassword` from the returned user.
3. If `mustChangePassword=true`, show change-password before normal app navigation.
4. After the user has a stable password, call `GET /auth/recovery-phrase/status` and prompt onboarding if `enabled=false`.
5. On recovery phrase generation, show the phrase ONCE and require the user to copy, print, or store it offline.

## Endpoint map

| UI moment                   | Endpoint                               | Auth                  | Payload                                                                                                 | Success                                                                              | Edge state                                                   |
| --------------------------- | -------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Login                       | `POST /auth/login`                     | None                  | `{ "email": "admin@example.test", "password": "Example123!" }`                                          | Current user + auth cookies                                                          | `401` generic invalid credentials                            |
| Session restore             | `GET /auth/me`                         | `md_access` cookie    | None                                                                                                    | Current user                                                                         | `401` means redirect to login or try refresh                 |
| Refresh                     | `POST /auth/refresh`                   | `md_refresh` cookie   | None                                                                                                    | Current user + rotated cookies                                                       | `401` means force login                                      |
| Logout                      | `POST /auth/logout`                    | Cookie if present     | None                                                                                                    | `{ "success": true }`                                                                | Always clear frontend state                                  |
| Forced/self password change | `POST /auth/change-password`           | `md_access` cookie    | `{ "currentPassword": "Temp1234!", "newPassword": "NewSecure123!" }`                                    | Current user                                                                         | Old access token is invalid immediately after success        |
| Recovery status             | `GET /auth/recovery-phrase/status`     | `md_access` cookie    | None                                                                                                    | `{ "enabled": true, "generatedAt": "2026-05-12T12:00:00.000Z", "consumedAt": null }` | Never contains phrase/hash                                   |
| Generate/rotate phrase      | `POST /auth/recovery-phrase/generate`  | `md_access` cookie    | `{ "currentPassword": "NewSecure123!" }`                                                                | One-time phrase response                                                             | User must store offline before closing                       |
| Public recovery             | `POST /auth/recovery-phrase/recover`   | None                  | `{ "email": "admin@example.test", "recoveryPhrase": "word ... word", "newPassword": "Recovered123!" }`  | `{ "success": true }`                                                                | `401 Recovery failed`, `429 Too many recovery attempts`      |
| Admin create user           | `POST /admin/users`                    | `ADMIN` access cookie | `{ "email": "sales@example.test", "name": "Sales", "role": "SALES", "temporaryPassword": "Temp1234!" }` | User + `temporaryPassword` once                                                      | No email automation                                          |
| Admin reset password        | `POST /admin/users/:id/reset-password` | `ADMIN` access cookie | `{ "temporaryPassword": "Temp1234!" }`                                                                  | User + `temporaryPassword` once                                                      | Clears old recovery phrase and invalidates old access tokens |

## DTO examples

### Current user response

```json
{
  "id": "user-1",
  "email": "admin@example.test",
  "name": "Admin User",
  "role": "ADMIN",
  "mustChangePassword": false
}
```

### Recovery phrase generate response

```json
{
  "phrase": "alpha bravo cable delta ember forest galaxy harbor",
  "words": [
    "alpha",
    "bravo",
    "cable",
    "delta",
    "ember",
    "forest",
    "galaxy",
    "harbor"
  ],
  "generatedAt": "2026-05-12T12:00:00.000Z"
}
```

The example phrase is documentation-only. Do not hardcode sample phrases in tests, seed data, or UI state.

## Recommended screens and states

| Screen/state                              | Recommended UX                                                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First login with temporary password       | Block normal navigation, explain that the admin-created password must be changed, then call `POST /auth/change-password`.                                 |
| `mustChangePassword=true` after any login | Show the change-password form immediately; do not hide this behind settings.                                                                              |
| Recovery phrase onboarding                | After stable login, show status. If disabled, explain that recovery is local/in-app only and ask for current password to generate.                        |
| Phrase shown once                         | Use a high-friction confirmation: “I copied/printed/stored this offline.” Do not offer “show later”; the API will not return it again.                    |
| Recovery screen                           | Ask only for email, 8-word phrase, and new password. Keep all failures generic: “Recovery failed.”                                                        |
| Lockout / rate limit                      | On `429`, say: “Too many recovery attempts. Wait and try again.” Do not imply whether the account exists.                                                 |
| Admin-managed reset                       | Tell the admin to deliver the temporary password manually. The user must change it on next login. Old recovery phrases and access tokens are invalidated. |

## Out of scope in v1

- No email, WhatsApp, Telegram, SMS, or external recovery automation.
- No client-generated recovery phrases.
- No plaintext phrase retrieval after the generation response.
- No frontend access to token contents; cookies are HttpOnly by design.

## Frontend checklist

- [ ] Use `credentials: "include"` for browser requests.
- [ ] Never store passwords, tokens, cookies, recovery phrases, or temporary passwords in local storage.
- [ ] Treat `401` on `/auth/me` after password change/reset/recovery as expected token invalidation.
- [ ] Treat `429` recovery responses as a generic lockout state.
- [ ] Make offline storage of the recovery phrase explicit before dismissing the one-time phrase screen.
