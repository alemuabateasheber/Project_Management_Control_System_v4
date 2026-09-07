# ADR-003: Authentication and session strategy

**Status:** Proposed

## Context

PMCS needs secure local authentication today while remaining ready for MFA and
enterprise OIDC/SSO. Users can belong to several organizations, so identity,
session, membership, and permission context must be separately revocable and
auditable. Long-lived browser tokens and client-stored authorization state
increase theft and stale-authorization risk.

## Decision

Use a global user identity with provider-specific identities and a local
Argon2id password credential where local login is enabled. Store only hashes
of password-reset, verification, and session secrets. Make MFA factors a
first-class identity capability so TOTP and WebAuthn can be added without an
account-model rewrite.

Issue a short-lived access token for API calls and keep it in browser memory.
Use a server-recorded, rotating refresh session in a `Secure`, `HttpOnly`,
appropriately `SameSite` cookie. Refresh rotation revokes the prior session and
reuse is treated as a security event. The API rechecks active membership and
permissions for protected requests; the active organization is authorized from
the authenticated session context, not trusted from a client-supplied header.

Apply login throttling, lockout controls, session revocation, CSRF protection
for cookie-authenticated state changes, and audit/security events. Add OIDC as
another identity provider rather than replacing the authorization model.

## Alternatives considered

- **Long-lived JWTs in local storage:** operationally simple, but exposes
  durable credentials to XSS and makes revocation weak.
- **Cookie-only stateless JWT authentication:** avoids a refresh endpoint, but
  makes session revocation, device management, and token reuse detection poor.
- **External identity provider only:** can be appropriate later, but prevents
  self-contained local deployment and does not solve PMCS authorization.

## Consequences

- The API and database must maintain session lifecycle records and rotation
  logic; authentication is not entirely stateless.
- Browser clients need a controlled token-refresh flow and must not persist
  access tokens in local storage.
- OIDC claims authenticate an identity; PMCS memberships, roles, and policies
  remain the authority for organization and project access.

