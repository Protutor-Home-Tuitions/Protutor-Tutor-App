# ProTutor Admin — Monorepo

React + Node.js + PostgreSQL (Supabase) admin panel.

## Local Setup (run these in order)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment

Copy and fill in the env files:
```bash
# Server
copy server\.env.example server\.env
# Web
copy web\.env.example web\.env
```

Edit `server/.env`:
- `DATABASE_URL` — paste your Supabase connection string
- `JWT_SECRET` — any long random string
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — from Razorpay dashboard

### 3. Push DB schema to Supabase
```bash
cd server
npx prisma generate
npx prisma db push
cd ..
```

### 4. Start dev servers (both at once)
```bash
npm run dev
```

- React app → http://localhost:3000
- API server → http://localhost:4000

### Login
- Phone: 
- Password: 

---

## Project Structure

```
protutor/
├── web/          React + Vite frontend
│   └── src/
│       ├── features/     One folder per screen
│       ├── store/        Zustand state
│       ├── components/   Shared UI
│       ├── utils/        Helpers
│       └── data/         Seed data (Phase 1)
├── server/       Node.js + Express API
│   ├── src/routes/
│   ├── src/middleware/
│   └── prisma/schema.prisma
└── shared/       Pure business logic (fee calc, commission chain)
```

## Migration Phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Scaffold + local seed data | ✅ Done |
| 2 | Migrate screens from admin_1.html | 🔄 In progress |
| 3 | Connect to Supabase API | ⏳ |
| 4 | Deploy to Vercel | ⏳ |
