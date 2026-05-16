# lms-web — IDC Digital Learning Platform

Next.js 15 frontend for the IDC Digital LMS.

## Branding

- Logo: `public/logo.svg` is an SVG approximation of the IDC Digital wordmark. **Drop the official PNG into `public/logo.svg` (or change the path in `app/layout.tsx`)** to use the real asset.
- Theme: brand colors defined in `app/globals.css` (CSS variables) and `tailwind.config.ts` (`brand.50` … `brand.900`). The accent blue is `#1e63f2`, header navy is `#0a1e44`. Tweak both files to match the live site once you've shared specific elements.

## Run

```bash
cp .env.local.example .env.local
npm install
npm run dev    # http://localhost:3000
```

Make sure the course-service backend is up at `http://localhost:8081`:

```bash
cd ../LMS/services/course-service
docker compose up -d
mvn spring-boot:run
```

## Slices

| # | Slice                          | Routes                                                | Status |
|---|--------------------------------|--------------------------------------------------------|--------|
| 1 | Course CRUD + publish          | `/courses`, `/courses/new`, `/courses/[id]`            | done   |
| 2 | Module + lesson management     | inline on `/courses/[id]`                              | done   |
| 3 | Lesson detail + asset upload   | `/lessons/[id]`                                        | done   |
| 4 | Course search                  | `/search?q=…`                                          | done   |
| 5 | AI provider admin + course-gen | `/admin/providers`, `/admin/usage`, `/courses/generate`| done   |
| 6 | Microsoft (Entra ID) sign-in   | `/login`, `/auth/callback`                             | done   |
| 7 | Admin user/role management     | `/login/admin`, `/admin/users`, `/admin/users/new`     | done   |

Talks to three backends: `NEXT_PUBLIC_API_BASE_URL` (course-service, 8081),
`NEXT_PUBLIC_AI_GATEWAY_URL` (ai-gateway-service, 8082), and
`NEXT_PUBLIC_AUTH_BASE_URL` (auth-service, 8083).

## First admin (one-time)

Set these env vars on `auth-service` before the very first start. On
startup, if no `ADMIN` user exists, auth-service seeds one:

```
BOOTSTRAP_ADMIN_EMAIL=you@example.com
BOOTSTRAP_ADMIN_PASSWORD=changeMe!12345
```

Then sign in at `/login/admin` and create more users in `/admin/users`.

## Microsoft sign-in setup (one-time)

1. **Register an app in Entra ID** (Azure Portal → Entra ID → App registrations → New):
   - Supported account types: pick what you need (single tenant is fine).
   - Redirect URI: **Web** → `http://localhost:3000/auth/callback`.
2. Note the **Application (client) ID** and the **Directory (tenant) ID** from the Overview page.
3. **Certificates & secrets** → New client secret. Copy the value.
4. **API permissions** → defaults (`User.Read`, `openid`, `profile`, `email`) are enough.
5. Set the values:
   - Frontend (`.env.local`): `NEXT_PUBLIC_MS_CLIENT_ID`, `NEXT_PUBLIC_MS_TENANT_ID`.
   - auth-service env: `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`.
6. Both processes share `JWT_SECRET` so the token auth-service issues is accepted by every other service.

## Manual test plan

### Slice 1 — sign in + course CRUD

1. Open `/login`, click **Sign in with Microsoft** → Microsoft consent → bounce back to `/auth/callback` → land on `/courses`.
2. `/courses` is empty.
3. Create a course; opens detail page in `DRAFT`.
4. Click **Publish** — expect a red error (no modules) — backend lifecycle validates this.

### Slice 2 — modules + lessons

1. On the course detail page, add a module.
2. Add a lesson inside the module (title + optional duration).
3. Delete a lesson, then delete the module.
4. Add a module and a lesson, then **Publish** — should succeed.
5. **Unpublish** sends it back to `DRAFT`.

### Slice 3 — assets

1. From the published course detail, click a lesson title → `/lessons/[id]`.
2. Pick a file in the upload control. Asset row appears with size + content type.
3. Click the asset link — opens in a new tab (served by the backend's local file controller).
4. Delete the asset.

### Slice 4 — search

1. From `/courses`, type into the search box and press Enter.
2. `/search?q=…` shows matching courses (Postgres full-text search, title weight A, description weight B).
3. Empty query returns no results.

### Slice 5 — AI providers + course generation

Start the ai-gateway too:

```bash
cd ../LMS/services/ai-gateway-service
docker compose up -d
mvn spring-boot:run
```

1. `/admin/providers` → **Add provider**. Easiest path: pick `OLLAMA`, leave key blank, set model = `llama3.2`, base URL = `http://localhost:11434`. Make it default. (Run `ollama pull llama3.2` first.)
2. Back on the list, click **Test** — should return OK + a sample.
3. `/courses` → **Generate with AI** → enter a topic → submit. Wait 30–60s. You'll be redirected to the new course detail page with modules and lessons populated.
4. `/admin/usage` → confirm a `SUCCESS` row appeared with the model and token counts.
5. Stop Ollama and try again — `/admin/usage` should show an `ERROR` row, and the next provider in priority order (if any) would be tried.
