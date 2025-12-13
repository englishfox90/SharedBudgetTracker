# Railway Deployment Guide

## Prerequisites
1. Railway account (https://railway.app)
2. GitHub repository pushed with all code
3. This project committed and pushed to GitHub

## Deployment Steps

### 1. Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your `SharedBudgetTracker` repository
5. Railway will auto-detect Next.js and configure build settings

### 2. Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a PostgreSQL database
4. The `DATABASE_URL` environment variable will be auto-configured

### 3. Configure Environment Variables
In Railway project settings, add these variables:

```bash
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://your-app.railway.app
```

**To generate AUTH_SECRET locally:**
```bash
openssl rand -base64 32
```

Copy the output and paste it as AUTH_SECRET in Railway.

### 4. Deploy
1. Railway will automatically build and deploy on every git push
2. First deployment will:
   - Install dependencies
   - Run `prisma generate` (via postinstall)
   - Run Prisma migrations automatically
   - Build Next.js app
   - Start production server

### 5. Update NEXTAUTH_URL
1. After first deployment, Railway will give you a URL like `https://sharedbudgettracker-production.up.railway.app`
2. Update the `NEXTAUTH_URL` environment variable with this URL
3. Railway will auto-redeploy

### 6. Set Your Credentials
After deployment, you need to set your login credentials on the production database.

**Option A: Using Railway Shell**
1. In Railway project, click on PostgreSQL service
2. Click "Connect" tab → "Connect via Shell"
3. Once connected, update the user:
```sql
UPDATE users SET email = 'your.email@example.com', password = '<bcrypt-hash>' WHERE id = 1;
```

**Option B: Run Script Locally Against Production DB**
1. Get the production DATABASE_URL from Railway
2. Temporarily set it in your local `.env`
3. Run: `npx tsx scripts/update-credentials.ts your.email@example.com YourPassword123`
4. Restore your local DATABASE_URL

### 7. Verify Deployment
1. Visit your Railway app URL
2. You should see the login page
3. Log in with your credentials
4. Verify your account data is accessible

## Post-Deployment Checklist
- [ ] PostgreSQL database created
- [ ] AUTH_SECRET set (secure random string)
- [ ] NEXTAUTH_URL set to Railway app URL
- [ ] Initial deployment successful
- [ ] Migrations ran successfully
- [ ] User credentials updated on production
- [ ] Login works
- [ ] Account data visible after login
- [ ] All API routes protected (test by logging out)

## Ongoing Deployments
After initial setup, Railway automatically deploys on every `git push` to main branch.

## Troubleshooting

### Build Fails
- Check Railway logs for specific error
- Ensure all dependencies are in `package.json`
- Verify `postinstall` script runs `prisma generate`

### Database Connection Issues
- Verify DATABASE_URL is set (should be automatic)
- Check PostgreSQL service is running in Railway

### Login Not Working
- Verify AUTH_SECRET is set
- Verify NEXTAUTH_URL matches your Railway app URL
- Check user exists in database with correct password hash

### "Unauthorized" Errors
- Clear browser cookies and try logging in again
- Verify middleware.ts is deployed
- Check AUTH_SECRET hasn't changed

## Environment Variables Reference

| Variable | Development | Production (Railway) |
|----------|-------------|---------------------|
| DATABASE_URL | Local PostgreSQL | Auto-set by Railway |
| AUTH_SECRET | Any random string | **Secure random** (openssl) |
| NEXTAUTH_URL | http://localhost:3000 | https://your-app.railway.app |

## Security Notes
1. **Never commit `.env` to git** - it's already in `.gitignore`
2. **Use different AUTH_SECRET for production** - not the same as development
3. **Use strong password** when setting production credentials
4. **Railway environment variables are encrypted** and not visible in logs

---

**Ready to deploy!** 🚀
