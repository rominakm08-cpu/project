# CONCEPT ADS — Telegram Mini App

UGC marketplace connecting brands and creators in Kazakhstan.

## Architecture

- **Frontend**: React + TypeScript (Vite), react-router-dom, Zustand, Axios
- **Backend**: Express.js (TypeScript), better-sqlite3 (SQLite)
- **Port**: 5000 (both API and Vite frontend served on same port)

## Roles

| Role     | Access                                  |
|----------|-----------------------------------------|
| pending  | Onboarding → register as creator/business |
| creator  | Home, Offers, Projects, Profile         |
| business | Home, Create Offer, Projects, Profile   |
| admin    | Dashboard, Creators, Businesses, Offers, Referrals |

## Auth

Telegram WebApp initData validation via HMAC-SHA256.  
DEV mode: sends `x-test-user` JSON header with fake user `{ id: 123456789 }`.

## Database

SQLite at `data/concept.db`. Tables: users, creators, businesses, offers, applications, projects, referrals, points_log, transactions, notifications.

## Set Admin

```bash
POST /api/admin/set-admin  { "secret": "<ADMIN_SECRET>", "telegram_id": "YOUR_TG_ID" }
```

Set `ADMIN_SECRET` env var first.

## Environment Variables

- `BOT_TOKEN` — Telegram bot token (for WebApp initData validation in prod)
- `ADMIN_SECRET` — Secret for set-admin endpoint
- `SESSION_SECRET` — Express session secret

## Key Files

- `client/src/App.tsx` — Role-based router
- `client/src/store/index.ts` — Zustand auth store
- `client/src/api/index.ts` — Axios API client
- `client/src/index.css` — Dark glass-morphism theme
- `server/routes.ts` — All API routes + DB setup
- `data/concept.db` — SQLite database (auto-created)
