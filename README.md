# CreatorMarket

A marketplace platform connecting content creators with businesses. This monorepo contains three sub-projects:

| Directory | Stack | Purpose |
|---|---|---|
| `backend/` | Node.js · Express · Prisma · PostgreSQL | REST API + JWT auth |
| `mobile/` | Expo 56 · React Native · Expo Router | iOS & Android app |
| `web/` | React · Vite · TypeScript | Web dashboard |

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | v20+ | [nodejs.org](https://nodejs.org) |
| Docker Desktop | latest | [docker.com](https://www.docker.com/products/docker-desktop) |
| Expo CLI | v0.22+ | `npm install -g expo-cli` |
| Xcode | 15+ | iOS simulator (macOS only) |
| Android Studio | latest | Android emulator |

---

## Backend

The backend runs inside Docker (Postgres + pgAdmin + API). All commands are run from the `backend/` directory.

### First-time setup

```bash
cd backend
cp .env.example .env   # copy environment config (edit if needed)
```

### Start everything (Docker — recommended)

```bash
cd backend
./start.sh --docker
```

This builds the Docker image, starts Postgres, pgAdmin, and the API, runs migrations, and opens pgAdmin in your browser automatically.

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Swagger docs | http://localhost:3000/api/docs |
| Health check | http://localhost:3000/health |
| pgAdmin | http://localhost:5050 |

**pgAdmin login:** `admin@creatorhub.com` / `admin`
The database connection is pre-configured — click **Servers → marketplace_postgres** in the left sidebar.

### Common Docker commands

```bash
# Start normally (update existing containers)
./start.sh --docker

# Wipe DB data and reseed with test data
./start.sh --docker --reset-db

# Full clean reinstall (remove containers, volumes, and images then rebuild)
./start.sh --docker --fresh

# View live API logs
docker compose logs -f api

# Stop all containers
docker compose down

# Stop and remove DB data
docker compose down -v
```

### Run locally without Docker (dev mode)

Requires a local PostgreSQL instance running on port 5432.

```bash
cd backend
./start.sh             # tsx watch (hot reload)
./start.sh --prod      # build TypeScript and run compiled output
./start.sh --seed      # run seed after starting
./start.sh --skip-migrate  # skip Prisma migrations
```

### Database commands

```bash
cd backend
npm run db:migrate     # create a new migration (dev)
npm run db:push        # push schema changes without migration file
npm run db:seed        # seed the database with test data
npm run db:studio      # open Prisma Studio (visual DB browser) at http://localhost:5555
npx prisma generate    # regenerate the Prisma client
```

### Seed accounts

After running `--seed` or `--reset-db`, these test accounts are available:

| Role | Email | Password | Phone |
|---|---|---|---|
| Admin | admin@creatorhub.com | Admin@123456 | +9779800000001 |
| Creator | sarah@example.com | Creator@123 | +9779800000003 |
| Creator | james@example.com | Creator@123 | +9779800000004 |
| Business | hello@styleco.com | Business@123 | +9779800000006 |

### Environment variables (`.env`)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/creatormarket
JWT_ACCESS_SECRET=your-access-secret-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
FRONTEND_URL=http://localhost:5173,http://localhost:3000
```

---

## Mobile (Expo)

```bash
cd mobile
npm install
npm start          # start Expo dev server
```

Then press in the terminal:
- `i` — open iOS simulator (macOS + Xcode required)
- `a` — open Android emulator (Android Studio required)
- `w` — open in web browser

### Run on a physical device

1. Install the **Expo Go** app on your phone (App Store / Play Store).
2. Run `npm start` and scan the QR code shown in the terminal.

### Other commands

```bash
npm run ios        # build and run on iOS simulator directly
npm run android    # build and run on Android emulator directly
npm run lint       # run ESLint
```

### API connection

The mobile app connects to the backend at the URL defined in `src/lib/api.ts`. By default it points to `http://localhost:3000`. When testing on a physical device, replace `localhost` with your machine's local IP address (e.g. `192.168.1.x`).

---

## Web

```bash
cd web
npm install
npm run dev        # start Vite dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build locally
npm run lint       # run ESLint
```

---

## Swagger / API Docs

Swagger UI is available at **http://localhost:3000/api/docs** when the backend is running. It documents all available endpoints with request/response schemas. Authentication endpoints are under `/api/auth/*`.

To test authenticated endpoints in Swagger:
1. Call `POST /api/auth/login` with your credentials.
2. Copy the `accessToken` from the response.
3. Click **Authorize** (top right) and paste the token.

---

## pgAdmin

pgAdmin is bundled in the Docker stack and available at **http://localhost:5050**.

| Field | Value |
|---|---|
| Login email | admin@creatorhub.com |
| Login password | admin |
| Server | marketplace_postgres (pre-configured) |
| DB | creatormarket |
| DB user | postgres |
| DB password | postgres |

The server connection is pre-registered — no manual setup needed after the first Docker start.

---

## Project structure

```
marketplace/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # database schema
│   │   ├── migrations/         # migration history
│   │   └── seed.ts             # seed script
│   ├── src/
│   │   ├── modules/            # auth, creator, business, campaign, etc.
│   │   ├── config/             # swagger, jwt, mail config
│   │   └── app.ts              # express entry point
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── start.sh                # unified start script
│   └── .env.example
├── mobile/
│   └── src/
│       ├── app/                # Expo Router screens
│       │   ├── (auth)/         # login, signup, verify, forgot-password
│       │   ├── (creator)/      # creator tabs and screens
│       │   └── (business)/     # business tabs and screens
│       ├── context/            # AuthContext, ThemeContext, LanguageContext
│       ├── services/           # authService, profileService
│       └── lib/api.ts          # HTTP client
└── web/
    └── src/                    # React + Vite web dashboard
```

---

## Forgot Password Flow

1. Open the mobile app → Login screen → **Forgot Password?**
2. Enter your registered phone number → tap **Send Reset Code**
3. Check the Docker logs for the OTP: `docker compose logs -f api | grep "Password reset OTP"`
4. Enter the 6-digit OTP on the next screen
5. Enter and confirm your new password → redirected to login
