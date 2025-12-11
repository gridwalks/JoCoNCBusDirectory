# How to Run SQL Script in Neon

## Quick Steps

1. **Go to Neon Dashboard**
   - Log into [console.neon.tech](https://console.neon.tech)
   - Select your project

2. **Open SQL Editor**
   - Click on **"SQL Editor"** in the left sidebar
   - Or click on your database name and select **"Query"**

3. **Run the Setup Script**
   - Open the file `setup_database.sql` in this project
   - Copy the entire contents
   - Paste into the Neon SQL Editor
   - Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verify Tables Were Created**
   - You should see a success message
   - Check the tables list - you should see:
     - Category
     - Business
     - Review
     - User
     - ContactSubmission

5. **Test Admin Login**
   - Go to your site: `https://your-site.netlify.app/admin`
   - Username: `admin`
   - Password: `admin123`

## What the Script Does

- Creates all 5 database tables with proper relationships
- Creates indexes for performance
- Inserts 4 default categories (Restaurants, Retail, Services, Healthcare)
- Creates admin user (username: `admin`, password: `admin123`)
- Inserts 2 sample businesses

## If You Get Errors

### "relation already exists"
- Tables already exist - that's okay, the script uses `IF NOT EXISTS`
- You can safely run it again

### "duplicate key value"
- Some data already exists - that's okay, the script uses `ON CONFLICT DO NOTHING`
- You can safely run it again

### "permission denied"
- Make sure you're connected to the correct database
- Check that you have write permissions

## After Running

Once the script completes successfully:
1. Your database is fully set up
2. Admin user is ready to use
3. Sample data is loaded
4. Your Netlify functions should work!

## Need to Reset?

If you want to start fresh:
```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS "ContactSubmission" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "Business" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
```

Then run `setup_database.sql` again.

