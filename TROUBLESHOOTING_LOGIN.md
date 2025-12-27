# Troubleshooting 401 Login Errors

## Step 1: Verify Admin User Exists

Run this in **Neon SQL Editor**:

```sql
SELECT "username", "email", "role" FROM "User" WHERE "username" = 'admin';
```

**Expected Result:** Should return 1 row with username='admin', role='admin'

**If no results:**
- The admin user doesn't exist
- Run `fix_admin_user.sql` in Neon SQL Editor

## Step 2: Check Password Hash

Run this in **Neon SQL Editor**:

```sql
SELECT 
    "username",
    LENGTH("password") as password_length,
    LEFT("password", 7) as hash_start
FROM "User" 
WHERE "username" = 'admin';
```

**Expected Result:**
- `password_length` should be **60**
- `hash_start` should be **$2a$10$**

**If incorrect:**
- Run `fix_admin_user.sql` to update the password hash

## Step 3: Verify Role is 'admin'

Run this in **Neon SQL Editor**:

```sql
SELECT "username", "role" FROM "User" WHERE "username" = 'admin';
```

**Expected Result:** `role` should be **'admin'** (not 'user')

**If incorrect:**
- Run `fix_admin_user.sql` to fix the role

## Step 4: Check Netlify Function Logs

1. Go to **Netlify Dashboard** → Your Site → **Functions**
2. Click on **auth-login**
3. Go to **Logs** tab
4. Try logging in again
5. Check the logs for:
   - "User found: ..." or "User not found in database"
   - "Password valid: true/false"
   - Any error messages

## Step 5: Quick Fix - Recreate Admin User

If nothing works, run this in **Neon SQL Editor**:

```sql
-- Delete existing admin
DELETE FROM "User" WHERE "username" = 'admin';

-- Create new admin with correct hash
INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES 
    (
        'admin-' || gen_random_uuid()::text,
        'admin',
        'admin@jocobusiness.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'admin',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Verify
SELECT "username", "role", LENGTH("password") as pwd_len FROM "User" WHERE "username" = 'admin';
```

## Login Credentials

- **Username:** `admin`
- **Password:** `admin123`

## Common Issues

### Issue: "User not found in database"
**Solution:** Run `fix_admin_user.sql` or the SQL above

### Issue: "Password does not match"
**Solution:** The password hash is wrong. Run `fix_admin_user.sql` to update it.

### Issue: "not an admin user"
**Solution:** The role is set to 'user' instead of 'admin'. Run `fix_admin_user.sql` to fix it.

### Issue: Database connection error
**Solution:** 
- Check that `NETLIFY_DATABASE_URL` is set in Netlify environment variables
- Verify the connection string is correct
- Check Neon dashboard to ensure database is running

## Still Not Working?

1. Check Netlify function logs (see Step 4)
2. Verify the database tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
3. Make sure you ran `setup_database.sql` first to create all tables
4. Try the quick fix SQL in Step 5


