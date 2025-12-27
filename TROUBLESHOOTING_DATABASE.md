# Troubleshooting Database Connection Issues

## Common Issues and Solutions

### 1. 500 Error: "Failed to fetch businesses"

This usually means one of the following:

#### A. Database Schema Mismatch (Error P2022: Column doesn't exist)
**This is the most common issue!** The database tables don't match the Prisma schema.

**Solution:** Run database migrations

1. Get your `NETLIFY_DATABASE_URL` from Netlify Dashboard → Site Settings → Environment Variables
2. Run migrations locally:

   **On Windows (PowerShell):**
   ```powershell
   # Set the environment variable
   $env:NETLIFY_DATABASE_URL="your-connection-string-here"
   
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
   export NETLIFY_DATABASE_URL="your-connection-string-here"
   
   # Verify it's set
   echo $NETLIFY_DATABASE_URL
   
   # Run migrations
   npm run prisma:migrate:deploy
   
   # Seed the database (creates admin user)
   npm run prisma:seed
   ```

3. **Verify:** After running migrations, check your Neon dashboard to confirm all tables were created with the correct columns.

#### B. NETLIFY_DATABASE_URL Not Set in Netlify
**Solution:** Add the environment variable

1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Click "Add a variable"
3. Key: `NETLIFY_DATABASE_URL`
4. Value: Your Neon PostgreSQL connection string (should look like: `postgresql://user:password@host/database?sslmode=require`)
5. Redeploy your site

#### C. Connection String Format Issues
**Check:**
- Connection string must include `?sslmode=require` at the end
- No extra spaces or quotes
- Full connection string is copied correctly

#### D. Database Not Accessible
**Check:**
- Neon database is running (not paused)
- Database allows connections from Netlify IPs
- Firewall rules allow connections

## How to Check Function Logs

1. Go to Netlify Dashboard → Your Site → Functions
2. Click on the function that's failing (e.g., `businesses`)
3. Check the "Logs" tab for detailed error messages
4. Look for:
   - `P1001`: Can't reach database server
   - `P1000`: Authentication failed
   - `P2022`: Column/table doesn't exist (schema mismatch - **run migrations!**)
   - `P2002`: Unique constraint violation
   - `P2025`: Record not found

## Testing Database Connection

You can test the connection by checking the function logs. The improved error messages will now show:
- Connection error codes
- Whether it's a connection issue
- More detailed error information

## Quick Fix Checklist

- [ ] `NETLIFY_DATABASE_URL` is set in Netlify environment variables
- [ ] Database migrations have been run (`npm run prisma:migrate:deploy`)
- [ ] Database is not paused in Neon dashboard
- [ ] Connection string includes `?sslmode=require`
- [ ] Site has been redeployed after setting environment variables

