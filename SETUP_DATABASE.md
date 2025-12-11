# Database Setup Instructions

## Problem
If you're getting 502 errors or "no tables" errors, the database hasn't been set up yet.

## Quick Fix - Run Migrations Locally

1. **Get your database URL from Netlify:**
   - Go to Netlify Dashboard → Your Site → Environment variables
   - Copy the value of `NETLIFY_DATABASE_URL`

2. **Run migrations locally:**
   ```bash
   # Set the environment variable
   export NETLIFY_DATABASE_URL="your-connection-string-from-netlify"
   
   # Or on Windows PowerShell:
   $env:NETLIFY_DATABASE_URL="your-connection-string-from-netlify"
   
   # Run migrations
   npm run prisma:migrate:deploy
   
   # Seed the database (creates admin user and sample data)
   npm run prisma:seed
   ```

3. **Verify:**
   - Check your Neon database dashboard - you should see tables created
   - Try logging into admin again

## Alternative: Use Prisma Studio

1. **Set environment variable:**
   ```bash
   export NETLIFY_DATABASE_URL="your-connection-string"
   ```

2. **Open Prisma Studio:**
   ```bash
   npm run prisma:studio
   ```

3. **Create tables manually or run migrations through the UI**

## Create Admin User Manually

If migrations ran but you don't have an admin user:

1. **Hash a password:**
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(console.log)"
   ```

2. **Insert into database:**
   - Use Prisma Studio: `npm run prisma:studio`
   - Or use SQL directly in Neon dashboard
   - Username: `admin`
   - Password: (the hashed value from step 1)
   - Role: `admin`

## Troubleshooting

### Error: "Environment variable not found"
- Make sure `NETLIFY_DATABASE_URL` is set in your environment
- Check that the variable name matches exactly

### Error: "Connection refused"
- Verify your connection string is correct
- Check that your Neon database is running
- Ensure SSL mode is set: `?sslmode=require`

### Error: "Table does not exist"
- Run migrations: `npm run prisma:migrate:deploy`
- Check that migrations ran successfully

