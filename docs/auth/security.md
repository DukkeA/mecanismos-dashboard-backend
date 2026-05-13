# Auth security posture

The current security posture is COOKIE-FIRST: access and refresh tokens stay in HttpOnly cookies, refresh tokens rotate, forced password change is explicit in the user state, and admin-only routes enforce explicit role checks.

## Quick path

1. Keep both auth tokens in HttpOnly cookies.
2. Treat `md_access` as short-lived and `md_refresh` as rotatable.
3. Revoke the refresh-session family on reuse.
4. Force password rotation after admin-created or admin-reset credentials.
5. Allow admin-only access only for `ADMIN`.
6. Treat recovery phrases like passwords: generate 8 real English words server-side, hash at rest, return plaintext once, and consume/clear on recovery or admin reset.
7. Keep root `.env` as the current local source of truth until real deployment environments exist.

## Cookie contract

| Cookie        | Default name | Path            | Why                                             |
| ------------- | ------------ | --------------- | ----------------------------------------------- |
| Access token  | `md_access`  | `/`             | Sent to protected app routes such as `/auth/me` |
| Refresh token | `md_refresh` | `/auth/refresh` | Narrower path for refresh-only traffic          |

## Cookie attributes

| Attribute  | Local default | Production expectation | Notes                                                   |
| ---------- | ------------- | ---------------------- | ------------------------------------------------------- |
| `HttpOnly` | `true`        | `true`                 | JS cannot read the tokens                               |
| `Secure`   | `false`       | `true`                 | Local HTTP can run without TLS; production MUST use TLS |
| `SameSite` | `lax`         | Configurable           | Fits same-site subdomain assumptions today              |
| `Domain`   | optional      | Configurable           | Use only when deployment topology requires it           |

## CSRF posture

Answer first: current v1 assumes SAME-SITE SUBDOMAIN DEPLOYMENT, so `SameSite=Lax` plus origin allowlisting plus explicit unsafe-request `Origin`/`Referer` checks is the active posture.

### What this means now

- CORS uses `credentials: true` with explicit allowed origins.
- Unsafe auth requests (`POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`) allow local/supertest requests with no `Origin` or `Referer`, but when either header is present it MUST resolve to an allowed frontend origin.
- Recovery phrase writes (`POST /auth/recovery-phrase/generate` and `POST /auth/recovery-phrase/recover`) use the same unsafe-request origin checks.
- `Origin` and `Referer` mismatches fail closed with `403 Forbidden` before the auth service runs.
- If deployment becomes truly cross-site, the team MUST switch to `SameSite=None` and add stronger CSRF controls before release automation depends on it.

## Protected-route model

| Layer                          | Responsibility                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT strategy                   | Extract `md_access` from cookies and validate the signature/expiry                                                                                             |
| JWT auth guard                 | Block requests without a valid access token                                                                                                                    |
| Roles guard                    | Reject authenticated non-admin users on admin-only routes                                                                                                      |
| `AuthService.getCurrentUser()` | Re-load active user identity for `/auth/me`                                                                                                                    |
| `AuthService.changePassword()` | Verify the current password before replacing the hash and clearing forced password change                                                                      |
| Recovery phrase flow           | Let active login users manage their own phrase, store only bcrypt hashes, return phrase plaintext only during generation, and return generic recovery failures |

## Operational gotchas

- Swagger metadata documents cookie auth, but Swagger UI is NOT the primary verification path for HttpOnly-cookie flows.
- Root `.env` is shared by Nest runtime, Prisma CLI, and local auth tests for now.
- Non-admin roles are valid authenticated users; they remain forbidden from admin-only routes but can manage and use their own recovery phrase.
- Forced password change relies on `mustChangePassword`; admin resets revoke refresh sessions but existing access JWTs can still live until expiry.
- Public recovery attempts are rate-limited in-app by a hashed normalized-email + request-IP key; `429` responses stay generic and do not reveal account existence.
- Password changes, recovery resets, admin resets, and user deactivation bump `user.authVersion`, so older access JWTs fail immediately while refresh-session revocation remains in place.
- Admin password reset clears `recoveryPhraseHash`/generated metadata and marks the phrase consumed so a previously enrolled phrase cannot recover the account after reset.

## Reviewer checklist

- [ ] Access tokens are extracted from cookies, not request bodies.
- [ ] Refresh-token reuse revokes the family.
- [ ] Forced password change is visible through `/auth/login` and `/auth/me`, then cleared only by a valid `POST /auth/change-password`.
- [ ] Unsafe auth writes reject disallowed `Origin`/`Referer` values with `403`.
- [ ] Admin-only access fails with `403` for `SALES` and `MECHANIC`.
- [ ] Local root `.env` usage is documented as a temporary stage decision, not a forever architecture.
- [ ] Recovery events, docs, seeds, and tests do not store real plaintext recovery phrases, passwords, cookies, tokens, or hashes.
