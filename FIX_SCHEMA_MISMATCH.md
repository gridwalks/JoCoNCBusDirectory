# Fix: Database Schema Mismatch (P2022 Error)

## The Problem

You're seeing this error:
```
The column `Business.source` does not exist in the current database.
Error code: P2022
```

This means your database tables don't match your Prisma schema. The database is missing columns (or entire tables).

## Solution: Create and Run Migrations

### Step 1: Get Your Database Connection String

1. Go to **Netlify Dashboard** → Your Site → **Environment variables**
2. Find `NETLIFY_DATABASE_URL` and copy its value
3. It should look like: `postgresql://user:password@host/database?sslmode=require`

### Step 2: Set Environment Variable and Create Initial Migration

**On Windows (PowerShell):**
```powershell
# Set the environment variable
$env:NETLIFY_DATABASE_URL="paste-your-connection-string-here"

# Verify it's set
echo $env:NETLIFY_DATABASE_URL

# Create the initial migration (this will create migration files)
npm run prisma:migrate

# This will prompt you to name the migration - use: "init" or "initial"
```

**On Mac/Linux:**
```bash
# Set the environment variable
export NETLIFY_DATABASE_URL="paste-your-connection-string-here"

# Verify it's set
echo $NETLIFY_DATABASE_URL

# Create the initial migration (this will create migration files)
npm run prisma:migrate

# This will prompt you to name the migration - use: "init" or "initial"
```

### Step 3: Apply Migrations to Database

After creating the migration files, apply them:

```bash
# Apply migrations to your database
npm run prisma:migrate:deploy
```

### Step 4: Seed the Database

```bash
# Seed the database (creates admin user and sample data)
npm run prisma:seed
```

### Step 5: Verify

1. Go to your **Neon Dashboard**
2. Open your database project
3. Check the **Tables** section
4. You should see these tables with all columns:
   - `Category` (id, name, description, icon, createdAt, updatedAt)
   - `Business` (id, name, description, address, city, state, zip, phone, email, website, categoryId, latitude, longitude, logo, images, **source**, createdAt, updatedAt)
   - `Review` (id, businessId, userId, userName, rating, comment, createdAt, updatedAt)
   - `User` (id, username, email, password, role, createdAt, updatedAt)
   - `ContactSubmission` (id, businessId, name, email, phone, message, createdAt)

## Alternative: Quick Fix with db push

If you just want to sync the schema quickly without creating migration files:

```bash
# Set environment variable (see Step 1)
$env:NETLIFY_DATABASE_URL="your-connection-string"  # Windows PowerShell
# or
export NETLIFY_DATABASE_URL="your-connection-string"  # Mac/Linux

# Push schema directly to database (no migration files)
npx prisma db push

# Seed the database
npm run prisma:seed
```

**Note:** `db push` is good for development but for production you should use migrations.

## After Fixing

Once migrations are complete:
1. All tables will be created with the correct columns
2. The `source` column will exist in the `Business` table
3. Your site should work without the P2022 error
4. Test by visiting: `https://joconcbusdir.netlify.app`

## Still Getting Errors?

1. **Check Netlify function logs:**
   - Netlify Dashboard → Your Site → Functions → `businesses` → Logs
   - Look for any new error messages

2. **Verify connection string:**
   - Make sure it includes `?sslmode=require` at the end
   - No extra spaces or quotes
   - Full connection string is copied correctly

3. **Check database status:**
   - Make sure your Neon database is running (not paused)
   - Verify you can connect to it from your local machine

