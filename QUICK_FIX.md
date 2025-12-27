# Quick Fix for 502 Errors and Missing Tables

## The Problem
- 502 error on `/admin` login
- No tables in database
- Functions failing because database isn't set up

## Solution: Run Database Migrations

### Step 1: Get Your Database Connection String

1. Go to **Netlify Dashboard** → Your Site → **Environment variables**
2. Find `NETLIFY_DATABASE_URL` and copy its value
3. It should look like: `postgresql://user:password@host/database?sslmode=require`

### Step 2: Run Migrations Locally

**On Windows (PowerShell):**
```powershell
# Set the environment variable
$env:NETLIFY_DATABASE_URL="paste-your-connection-string-here"

# Verify it's set
echo $env:NETLIFY_DATABASE_URL

# Run migrations
npm run prisma:migrate:deploy

# Seed the database (creates admin user)
npm run prisma:seed
```

**On Mac/Linux:**
```bash
# Set the environment variable
export NETLIFY_DATABASE_URL="paste-your-connection-string-here"

# Verify it's set
echo $NETLIFY_DATABASE_URL

# Run migrations
npm run prisma:migrate:deploy

# Seed the database (creates admin user)
npm run prisma:seed
```

### Step 3: Verify Tables Were Created

1. Go to your **Neon Dashboard**
2. Open your database project
3. Check the **Tables** section
4. You should see: `Category`, `Business`, `Review`, `User`, `ContactSubmission`

### Step 4: Test Admin Login

1. Go to your site: `https://your-site.netlify.app/admin`
2. Login with:
   - Username: `admin`
   - Password: `admin123`

## If Migrations Fail

### Error: "Environment variable not found"
- Make sure you set `NETLIFY_DATABASE_URL` in your terminal
- On Windows, use PowerShell (not CMD)
- Verify with: `echo $env:NETLIFY_DATABASE_URL` (PowerShell) or `echo $NETLIFY_DATABASE_URL` (Mac/Linux)

### Error: "Connection refused" or "Connection timeout"
- Verify your connection string is correct
- Make sure it includes `?sslmode=require` at the end
- Check that your Neon database is running

### Error: "Prisma Client not generated"
```bash
npm run prisma:generate
```

## Alternative: Use Prisma Studio

If command line doesn't work:

1. Set environment variable (see Step 2)
2. Run: `npm run prisma:studio`
3. This opens a web UI where you can:
   - See your database tables
   - Run migrations
   - Create the admin user manually

## After Fixing

Once migrations are complete:
1. Tables will be created in Neon
2. Admin user will be created (username: `admin`, password: `admin123`)
3. Sample categories and businesses will be added
4. Your site should work!

## Still Having Issues?

Check the Netlify function logs:
1. Go to Netlify Dashboard → Your Site → **Functions**
2. Click on a function (e.g., `auth-login`)
3. Check the **Logs** tab for error messages


