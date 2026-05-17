# Run LMS locally

## TL;DR

```bash
git pull
docker compose up --build
```

Wait ~2 minutes on first run while images build. Then open **http://localhost:3000**.

Sign in:
- **Admin** → http://localhost:3000/login/admin → `admin@idc.local` / `AdminPass!123`
- **Microsoft** → http://localhost:3000/login → only works after you configure Entra (see below)

Stop: `Ctrl-C` then `docker compose down`.
Wipe data (clean slate): `docker compose down -v`.

## What started

| Container | Port | Notes |
|---|---|---|
| `web` | 3000 | Next.js frontend |
| `auth-service` | 8083 | Issues JWTs; admin/user CRUD |
| `course-service` | 8081 | Courses, modules, lessons, assets, AI generate |
| `ai-gateway-service` | 8082 | AI provider abstraction (OpenAI / Anthropic / Azure / Ollama) |
| 3 × Postgres | 5532, 5533, 5534 | One DB per service (off-default to avoid clashing with a local Postgres install) |

The other 9 scaffolded services (user, ai-orchestration, assessment, notification, analytics, workflow, reporting, search) aren't in this compose — they're independent and not needed for the test flow.

## Validate (5 minutes)

1. **Admin sign-in** → `/login/admin` → `admin@idc.local` / `AdminPass!123`.
2. **Users** → add a user, change role, toggle status, reset password.
3. **AI providers** → Add one. Easiest is Ollama (no API key):
   - Install [Ollama](https://ollama.com), then on **your host**: `ollama pull llama3.2`.
   - In the UI: type `OLLAMA`, name `local`, model `llama3.2`, base URL `http://host.docker.internal:11434` (Mac/Windows) or your host's docker bridge IP (Linux). Default.
   - Otherwise use type `OPENAI` with a real API key and model `gpt-4o-mini`.
   - Click **Test**; expect a green OK row.
4. **Courses** → create a course → add a module → add a lesson → **Publish**.
5. **Generate with AI** → topic, wait 30–60s, redirected to a new course populated by the AI.
6. **AI usage log** under Admin → a `SUCCESS` row appears.

## Microsoft sign-in (optional)

Skip for the first run — admin password login covers everything. To enable user sign-in via Microsoft, register an app in Entra ID (redirect URI `http://localhost:3000/auth/callback`), grab the client ID / tenant / secret, then start with:

```bash
MS_TENANT_ID=... MS_CLIENT_ID=... MS_CLIENT_SECRET=... docker compose up --build
```

The frontend bakes `NEXT_PUBLIC_MS_CLIENT_ID` into the JS bundle at build time. If you want it different from the default, set it in `apps/web/.env.local` before `docker compose up --build`.

## Hot-reload dev mode (alternative)

The compose flow rebuilds everything. For day-to-day work with hot-reload, use the scripts instead:

```bash
docker compose up -d course-db ai-gateway-db auth-db    # just the DBs
./scripts/start-dev.sh                                   # mvn spring-boot:run in background
cd apps/web && npm install && npm run dev                # Next.js dev server with HMR
```

Stop: `./scripts/stop-dev.sh && docker compose down`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build takes forever the first time | Expected — Maven downloads dependencies inside the container. Subsequent builds reuse the image layer. |
| Flyway "schema not empty" after a migration change | `docker compose down -v` to wipe DB volumes, then `docker compose up --build`. |
| AI generate returns 502 | `docker logs lms-ai-gateway-service`. Usually invalid key or unreachable host. |
| Browser shows "Failed to fetch" | One container hasn't booted. `docker compose ps` and `docker logs lms-<service>`. |
| Ollama unreachable from a container | Use `http://host.docker.internal:11434` on Mac/Windows or your host's docker0 IP on Linux. `localhost` inside the container is the container itself. |
