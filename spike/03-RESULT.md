# Spike 03 — Keycloak SSO login (#3, HIGHEST RISK)

## Precondition: any OAuth service configured on this instance?
Checked via `GET /api/v1/settings.oauth` (admin session) — result: `{"services":[],"success":true}`.
**No OAuth/Keycloak service is registered on this Rocket.Chat instance.** A real end-to-end SSO login cannot be exercised without first standing up a Keycloak realm+client and registering it as a Custom OAuth service in RC's admin settings — infrastructure and configuration decisions outside this spike's scope.

## Contract probe (no real IdP — testing the endpoint's error behavior only)

### expiresIn as string (per prompt warning: "harus integer, bukan string")
Request: `{"serviceName":"keycloak","accessToken":"dummy-token-for-contract-test","expiresIn":"3600"}`
Status: 500, latency: 75ms
```json
{
  "success": false,
  "error": "Internal server error"
}
```

### expiresIn as integer
Request: `{"serviceName":"keycloak","accessToken":"dummy-token-for-contract-test","expiresIn":3600}`
Status: 500, latency: 55ms
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Result: **FAIL** (as far as it can be tested)
Both requests return `500 Internal server error` — status 500 and 500 respectively — regardless of `expiresIn` type. Server-side Meteor log shows **no corresponding stack trace or log line** for either request (the REST API layer appears to swallow the exception before it reaches the console), so the exact cause couldn't be pinned down further from outside Rocket.Chat's own source without violating this project's "zero modification, don't dig into fixing RC" rule.
This reproduces the exact fragility WRAPPER_PROMPT.md warned about ("historically rapuh... ada PR upstream Maret 2026 yang memperbaiki 500 error"). Whether that fix has landed in 8.8.1 is unclear from this test alone — the 500 could equally be from `serviceName: "keycloak"` not matching any configured service (unhandled lookup miss) rather than the historical bug. **Cannot be disambiguated without a real Keycloak realm/client registered on this instance.**

See GATE 1 closing report for the three alternatives (a/b/c) presented to the user per WRAPPER_PROMPT.md.