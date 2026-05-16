# Run LMS locally

Minimum stack: `auth-service` + `course-service` + `ai-gateway-service` + Postgres for each + the Next.js frontend (`lms-web`, in a sibling directory).

## Prerequisites

- Docker (Desktop, OrbStack, etc.)
- Java 21
- Maven 3.9+
- Node 22+

## One-time

```bash
# 1. Start all 11 Postgres databases (only the 3 used for the test are critical)
docker compose up -d

# 2. Build everything once (optional, speeds up first mvn spring-boot:run)
mvn -f services/auth-service/pom.xml -q -DskipTests package
mvn -f services/course-service/pom.xml -q -DskipTests package
mvn -f services/ai-gateway-service/pom.xml -q -DskipTests package
```

## Start the backends

```bash
./scripts/start-dev.sh
```

This launches `auth-service` (8083), `course-service` (8081), `ai-gateway-service` (8082) in the background, with logs in `./logs/<service>.log`. The script sets a default `JWT_SECRET` (same for all three) and seeds an admin via `BOOTSTRAP_ADMIN_EMAIL=admin@idc.local` / `BOOTSTRAP_ADMIN_PASSWORD=AdminPass!123`. Override either env var before running if you want.

Wait ~30s for first startup, then check:

```bash
curl -s http://localhost:8083/actuator/health   # auth     -> {"status":"UP"}
curl -s http://localhost:8081/actuator/health   # course
curl -s http://localhost:8082/actuator/health   # ai-gateway
```

## Frontend

Extract the latest `lms-web-*.tar.gz` next to this repo, then:

```bash
cd lms-web
cp .env.local.example .env.local           # defaults already point at 8081/8082/8083
npm install
npm run dev                                # http://localhost:3000
```

## Validate (5-minute walkthrough)

1. **Sign in as admin** — `http://localhost:3000/login/admin` with `admin@idc.local` / `AdminPass!123`.
2. **Users** — add an instructor, change their role, toggle status, reset password.
3. **AI providers** — Add one. Easiest path: install [Ollama](https://ollama.com) and `ollama pull llama3.2`, then register provider type `OLLAMA`, model `llama3.2`, base URL `http://localhost:11434`, mark as default. Otherwise register `OPENAI` with your API key. Click **Test**; expect a green OK row.
4. **Courses** — Create a course manually, add a module + lesson, **Publish**. Upload a file on the lesson detail page; the link should serve the file back from `course-service`.
5. **AI generate** — `/courses/generate`, type a topic, submit, wait 30–60s. New course appears with modules/lessons populated. Check **Admin → AI usage log** for a `SUCCESS` row.
6. **Search** — type a word in the course list search bar; results from Postgres full-text search.

## Stop

```bash
./scripts/stop-dev.sh         # stops the three Spring Boot processes
docker compose down            # stops the Postgres containers
docker compose down -v         # ALSO wipes the DB volumes (clean slate)
```

## Microsoft sign-in (optional)

Skip for the first run — admin password login covers the test path. To enable user sign-in via Microsoft:

1. Entra ID → App registrations → New app, redirect URI `http://localhost:3000/auth/callback`. Note client id, tenant id; create a client secret.
2. `.env.local` on the frontend: `NEXT_PUBLIC_MS_CLIENT_ID`, `NEXT_PUBLIC_MS_TENANT_ID`.
3. Re-export auth-service env: `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, then `./scripts/stop-dev.sh && ./scripts/start-dev.sh`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Flyway "schema not empty" | `docker compose down -v && docker compose up -d` to wipe DB volumes. |
| 401 on every request | Make sure auth-service, course-service, and ai-gateway-service all started with the **same** `JWT_SECRET`. The script handles this automatically; you only hit this if you started a service manually with a different value. |
| Frontend "Failed to fetch" | One of the backends isn't up. `tail -f logs/<service>.log` to see why. |
| AI generate fails | `/admin/usage` shows the error per attempt. Usually a missing/wrong API key or Ollama not running. |
| "address already in use" | Stop the previous run: `./scripts/stop-dev.sh`. |
