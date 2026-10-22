# MSS Admin

Admin panel for the MSS (MSME Schemes) app. Admins create and edit schemes, upload the 2026 datasets, approve changes, publish releases to the app and send notifications. Everything goes through the **MSS REST API** (`https://mssapi.msmeschemes.org`); this site has no database of its own and no Supabase.

## How it works

- **Sign-in**: an MSS account's email and password (`POST /v1/auth/password/login`). The site then calls `GET /v1/admin/security/status` and refuses accounts without the server-provisioned admin role.
- **Session**: the access token (~15 min) and rotating refresh token live only in httpOnly cookies. `src/proxy.ts` refreshes them shortly before they expire, so pages and Server Actions always have a valid bearer. Browser code never sees a token.
- **API calls** run server-side only (`src/lib/mss/`, guarded by `server-only`). The API enforces the admin role on every request.
- **Publishing workflow** (API entries 03–12):
  1. **Draft**: create or edit a scheme in the editor (form, or the full record as JSON), or upload a dataset file (preview → stage as drafts).
  2. **Approve**: each draft revision is approved with a 10–2000 character review note (bulk approval on Releases respects the 20 requests/minute admin quota).
  3. **Publish**: publish approved drafts as a new catalogue release. Apps pick it up on their next catalogue check.
  Withdrawing a published scheme is a draft too (`action: withdraw`).
- **Notifications**: `POST /v1/admin/notifications` delivers to one user's in-app inbox and, where the device is registered, a push notification. The API has no broadcast endpoint yet, so "notify everyone when a scheme is published" needs a server change.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | API health, draft counts, live release, recent changes |
| `/schemes` | All drafts with search, status and collection filters; withdraw |
| `/schemes/new`, `/schemes/[id]` | Scheme editor, approve/discard, audit history |
| `/schemes/upload` | Dataset upload: preview, then stage as drafts |
| `/releases` | Approve waiting drafts, publish approved ones |
| `/notifications` | Send a notification to a user |

## Running it

```bash
npm install
npm run dev
```

Environment (optional):

| Variable | Default | |
| --- | --- | --- |
| `MSS_API_BASE_URL` | `https://mssapi.msmeschemes.org` | API origin, with or without `/v1` |

Checks: `npx tsc --noEmit`, `npx eslint src`, `npm run build`.
