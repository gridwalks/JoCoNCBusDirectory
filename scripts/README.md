# Database Reset Scripts

## SQL Script (Recommended)

The easiest way to reset your database is using the SQL script directly in Neon's SQL Editor.

### Option 1: Using Neon SQL Editor

1. Go to your **Neon Dashboard** → Your Project → **SQL Editor**
2. Copy the contents of `scripts/reset-database.sql`
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Option 2: Using psql Command Line

```bash
# Set your connection string
export NETLIFY_DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Run the SQL script
psql "$NETLIFY_DATABASE_URL" -f scripts/reset-database.sql
```

**Windows PowerShell:**
```powershell
$env:NETLIFY_DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
psql $env:NETLIFY_DATABASE_URL -f scripts/reset-database.sql
```

## Node.js Script (Alternative)

If you prefer a Node.js script that handles migrations automatically:

```bash
# Set environment variable
export NETLIFY_DATABASE_URL="your-connection-string"

# Run the script
npm run db:reset
```

## What the Scripts Do

Both scripts will:
1. ✅ Drop all existing tables (CASCADE to handle foreign keys)
2. ✅ Create all tables according to Prisma schema
3. ✅ Create indexes and foreign key constraints
4. ✅ Seed initial data:
   - 4 categories (Restaurants, Retail, Services, Healthcare)
   - Admin user (username: `admin`, password: `admin123`)
   - 2 sample businesses

## After Running

1. Verify tables were created in Neon Dashboard
2. Test your site: `https://joconcbusdir.netlify.app`
3. Login to admin panel with:
   - Username: `admin`
   - Password: `admin123`
   - **⚠️ Change this password in production!**

## Generating Password Hashes

To create a new admin password hash:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(console.log)"
```

Then update the hash in `scripts/reset-database.sql`.

