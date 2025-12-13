# PostgreSQL Migration Guide

## Overview

Migrating from SQLite to PostgreSQL for Railway deployment. This preserves all your existing data while enabling cloud deployment.

---

## Prerequisites

### Install PostgreSQL Locally

**Windows (Recommended: Use Chocolatey)**
```powershell
# If you have Chocolatey:
choco install postgresql

# Or download installer from:
# https://www.postgresql.org/download/windows/
```

**After installation:**
1. PostgreSQL service should auto-start
2. Default user: `postgres`
3. Default password: Set during installation (remember this!)
4. Default port: `5432`

---

## Migration Steps

### 1. Export Your SQLite Data

**IMPORTANT**: This step uses your **current SQLite database**. Don't skip it!

```powershell
# Export all data to JSON (before changing schema)
npx tsx scripts/export-sqlite-data.ts
```

This creates `prisma/sqlite-export.json` with all your data.

**✅ Backup checkpoint**: Copy `prisma/dev.db` and `prisma/sqlite-export.json` to a safe location!

---

### 2. Create PostgreSQL Database

Open PowerShell and connect to PostgreSQL:

```powershell
# Connect as postgres user (will prompt for password)
psql -U postgres

# Inside psql prompt, create database:
CREATE DATABASE shared_budget_tracker;

# Exit psql
\q
```

---

### 3. Configure Environment Variables

Create `.env` file in project root:

```bash
# Copy the example file
Copy-Item .env.example .env

# Edit .env and update the password to match your PostgreSQL installation
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/shared_budget_tracker?schema=public"
```

**Replace `YOUR_PASSWORD`** with the password you set during PostgreSQL installation.

---

### 4. Update Prisma Schema (Already Done ✅)

The schema has been updated to use PostgreSQL. Verify:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

---

### 5. Create PostgreSQL Tables

```powershell
# Generate Prisma Client for PostgreSQL
npm run db:generate

# Create migration and apply to database
npx prisma migrate dev --name init_postgresql

# This creates tables in PostgreSQL
```

You'll see a new `prisma/migrations/` folder with SQL migration files.

---

### 6. Import Your Data

```powershell
# Import data from sqlite-export.json
npx tsx scripts/import-to-postgres.ts
```

This will:
- Import all accounts, income rules, expenses, transactions
- Preserve all IDs and relationships
- Reset PostgreSQL sequences for auto-increment

---

### 7. Verify Migration

```powershell
# Start dev server
npm run dev

# Open http://localhost:3000
# Check:
# - All income sources appear
# - All recurring expenses appear  
# - Transactions are present
# - Forecasts calculate correctly
# - Recommendations work
```

**If something looks wrong:**
- Don't panic! Your `dev.db` backup is safe
- Check the terminal for import errors
- You can re-run import after fixing issues

---

## Troubleshooting

### "Connection refused" error
- PostgreSQL service not running
- **Fix**: Start PostgreSQL service
  ```powershell
  # Check status
  Get-Service postgresql*
  
  # Start if stopped
  Start-Service postgresql-x64-16  # Version may vary
  ```

### "Database does not exist"
- Database wasn't created in step 2
- **Fix**: Run the `CREATE DATABASE` command again

### "Password authentication failed"
- Wrong password in `.env`
- **Fix**: Update `DATABASE_URL` in `.env` with correct password

### Import fails midway
- Usually a data type mismatch (rare with this migration)
- **Fix**: Check error message, may need to adjust import script
- Your SQLite data is safe, can retry

---

## Railway Deployment

Once local PostgreSQL works:

### 1. Add PostgreSQL to Railway
1. Go to Railway dashboard
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway auto-generates `DATABASE_URL` environment variable

### 2. Deploy App
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
git push railway main
```

### 3. Run Migration on Railway
```powershell
# Railway will automatically run:
# npx prisma migrate deploy
```

### 4. Seed Production Data (Optional)
If you want the same data on Railway:

```powershell
# Upload sqlite-export.json to Railway
railway run npx tsx scripts/import-to-postgres.ts
```

---

## Rollback Plan

If you need to go back to SQLite:

1. Stop the app
2. Change `schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
3. Restore `dev.db` from backup
4. Run `npm run db:generate`
5. Start app: `npm run dev`

**Your SQLite backup remains untouched throughout this process!**

---

## Key Differences: SQLite vs PostgreSQL

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| **Dates** | Stored as strings | Native TIMESTAMP type |
| **Auto-increment** | `autoincrement()` | `autoincrement()` (same) |
| **JSON** | Store as String | Native JSON type (we use String for compatibility) |
| **Transactions** | File locks | True ACID transactions |
| **Deployment** | ❌ Ephemeral on Railway | ✅ Persistent storage |

---

## Post-Migration Checklist

- [ ] Local PostgreSQL running successfully
- [ ] All data appears in app
- [ ] Forecasts calculate correctly
- [ ] Transactions list works
- [ ] Can add/edit/delete records
- [ ] `dev.db` backed up safely
- [ ] `.env` added to `.gitignore` (already done ✅)
- [ ] Railway database created
- [ ] App deployed to Railway
- [ ] Production data seeded (if desired)

---

## Need Help?

Check these files for reference:
- `scripts/export-sqlite-data.ts` - Exports SQLite data
- `scripts/import-to-postgres.ts` - Imports to PostgreSQL
- `prisma/schema.prisma` - Database schema
- `.env.example` - Environment variable template

**Common Commands:**
```powershell
# Check PostgreSQL service
Get-Service postgresql*

# Connect to database
psql -U postgres -d shared_budget_tracker

# View tables in psql
\dt

# Check row counts
SELECT COUNT(*) FROM accounts;
SELECT COUNT(*) FROM transactions;
```
