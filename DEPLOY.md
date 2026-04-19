# SkillSewa — Deploy

The app ships as a Docker stack: a Next.js web container + a MySQL 8 database container. State lives in a named Docker volume (`skillsewa-db-data`).

## Prerequisites

- Docker ≥ 24 with Compose v2
- A VPS with port 80/443 fronted by a reverse proxy (Nginx, Caddy, Traefik, Cloudflare Tunnel)

## One-time setup

Copy `.env.example` to `.env` and fill real secrets:

```bash
cp .env.example .env
# edit .env — change passwords, JWT/NextAuth secrets, payment keys, etc.
```

`docker-compose.yml` reads these via variable interpolation. At minimum set:

- `MYSQL_ROOT_PASSWORD` — MySQL root password
- `JWT_SECRET`, `NEXTAUTH_SECRET` — auth secrets (`openssl rand -base64 32`)
- `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` — public URL

## Build & run

```bash
# First run: build images and start the stack
docker compose up -d --build

# Tail logs
docker compose logs -f web
docker compose logs -f db

# Check everything
docker compose ps
curl -I http://localhost:3000
```

On first boot the `web` container runs `prisma db push` automatically against the `db` container to create the schema.

## Seed demo data (one time)

```bash
# Seed runs once — flip the flag, restart web, then turn it off again
RUN_SEED=true docker compose up -d web
docker compose logs -f web           # watch for "Seeding database..."
# once done, unset RUN_SEED in .env (or keep default false) so it doesn't re-seed
docker compose up -d web
```

Demo accounts (password `demo1234`):

- Admin: `9800000001`
- Professional: `9800000002`
- Customer: `9800000003`
- Supplier: `9800000004`

## Deploy on a VPS

```bash
git clone <your-repo> skillsewa && cd skillsewa
cp .env.example .env    # edit secrets
docker compose up -d --build
```

## Reverse proxy (Caddy example)

```Caddyfile
skillsewa.example.com {
    reverse_proxy 127.0.0.1:3000
    encode zstd gzip
}
```

Nginx equivalent:

```nginx
server {
    listen 443 ssl http2;
    server_name skillsewa.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Update

```bash
git pull
docker compose up -d --build
```

The web container's healthcheck gates the swap, and `prisma db push` runs on each start to keep the schema in sync.

## Backup & restore

```bash
# Backup
docker exec skillsewa-db sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" skillsewa' \
  > skillsewa-$(date +%F).sql

# Restore
docker exec -i skillsewa-db sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" skillsewa' \
  < skillsewa-2026-04-20.sql
```

## Jenkins CI/CD

`Jenkinsfile` pipelines:

1. Checkout
2. `npm ci`
3. `prisma generate`
4. `npm run lint`
5. `npm run build`
6. `docker build`
7. `docker compose up -d --build` (rebuilds + rolls web, keeps db + volume)
8. HTTP health check on port 3000

Required Jenkins credentials (Secret Text):

- `skillsewa-mysql-root-password`
- `skillsewa-jwt-secret`
- `skillsewa-nextauth-secret`

## Logs & lifecycle

```bash
docker compose logs -f web          # tail web logs
docker compose logs -f db           # tail db logs
docker compose restart web          # restart web only
docker compose down                 # stop (volume preserved)
docker compose down -v              # stop AND DELETE DB VOLUME — destructive
docker image prune -f               # reclaim old builds
```

## Image facts

- Multi-stage `node:22-alpine` build
- Runs as non-root (`nextjs:1001`)
- Exposes port 3000
- Embedded healthcheck (`/` GET on port 3000)
- Entrypoint waits for DB, then runs `prisma db push` before starting the server
- Uses Next.js `output: "standalone"` — final image ~250 MB
