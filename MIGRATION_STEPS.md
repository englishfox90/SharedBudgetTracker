# Quick Migration Steps - SQLite to PostgreSQL

**⚠️ IMPORTANT**: Follow these steps **in order** to preserve your data!

---

## Step 1: Export Current SQLite Data (REQUIRED!)

**Before changing anything**, export your current data:

```powershell
npx tsx scripts/export-sqlite-data.ts
```

✅ **Checkpoint**: Verify `prisma/sqlite-export.json` was created

---

## Step 2: Install PostgreSQL

**Windows (Chocolatey)**:
```powershell
choco install postgresql
```

**Or download**: https://www.postgresql.org/download/windows/

Default credentials:
- User: `postgres`
- Password: Set during installation (remember this!)
- Port: `5432`

---

## Step 3: Create Database

```powershell
# Connect to PostgreSQL
psql -U postgres

# Inside psql:
CREATE DATABASE shared_budget_tracker;
\q
```

---

## Step 4: Configure Environment

```powershell
# Create .env file
Copy-Item .env.example .env

# Edit .env and update password:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/shared_budget_tracker?schema=public"
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

---

## Step 5: Update Schema (Already Done ✅)

The `prisma/schema.prisma` has been updated to:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## Step 6: Create Tables

```powershell
# Generate Prisma client
npm run db:generate

# Create migration (creates tables)
npx prisma migrate dev --name init_postgresql
```

---

## Step 7: Import Your Data

```powershell
npx tsx scripts/import-to-postgres.ts
```

✅ **Checkpoint**: Script should report successful import of all tables

---

## Step 8: Test Locally

```powershell
npm run dev
```

Open http://localhost:3000 and verify:
- ✅ All income sources appear
- ✅ All expenses appear
- ✅ Transactions are present
- ✅ Forecasts work
- ✅ Recommendations generate

---

## Step 9: Deploy to Railway (When Ready)

1. Create Railway account: https://railway.app
2. Create new project
3. Add PostgreSQL database
4. Deploy from GitHub
5. Railway auto-runs migrations

**Optional**: Import your data to production:
```powershell
railway run npx tsx scripts/import-to-postgres.ts
```

---

## Troubleshooting

**"Connection refused"**:
```powershell
# Start PostgreSQL service
Get-Service postgresql*
Start-Service postgresql-x64-16
```

**"Authentication failed"**:
- Check password in `.env` matches PostgreSQL installation

**Need detailed help?**
See [docs/POSTGRESQL_MIGRATION.md](docs/POSTGRESQL_MIGRATION.md)

---

## Rollback (If Needed)

1. Change `schema.prisma` back to `provider = "sqlite"`
2. Restore `dev.db` from backup
3. Run `npm run db:generate`
4. Run `npm run dev`

**Your SQLite data is safe!** The migration scripts don't touch `dev.db`.
