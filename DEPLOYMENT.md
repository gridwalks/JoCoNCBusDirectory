# Deployment Guide

## Prerequisites

1. **Neon Database Setup**
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project
   - Copy your connection string (it will look like: `postgresql://user:password@host/database?sslmode=require`)

2. **Netlify Account**
   - Sign up at [netlify.com](https://netlify.com)

## Local Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Neon database connection string:
     ```
     DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
     JWT_SECRET="your-secret-key-here-change-in-production"
     ```

3. **Set Up Database**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed initial data (optional)
   npm run prisma:seed
   ```

4. **Start Development Server**
   ```bash
   # For frontend only
   npm run dev
   
   # For full stack (requires Netlify CLI)
   npm install -g netlify-cli
   netlify dev
   ```

## Deploy to Netlify

### Option 1: Deploy via Git (Recommended)

1. **Push to GitHub/GitLab/Bitbucket**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select your repository

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - These should be auto-detected, but verify them

4. **Add Environment Variables**
   In Netlify Dashboard → Site settings → Environment variables:
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `JWT_SECRET` - A secure random string (generate with: `openssl rand -base64 32`)

5. **Deploy**
   - Netlify will automatically deploy on every push to main
   - Or click "Trigger deploy" → "Deploy site" for manual deployment

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Initialize Site**
   ```bash
   netlify init
   ```

4. **Set Environment Variables**
   ```bash
   netlify env:set DATABASE_URL "your-neon-connection-string"
   netlify env:set JWT_SECRET "your-secret-key"
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

## Post-Deployment Steps

1. **Run Database Migrations**
   ```bash
   # Set DATABASE_URL in Netlify environment, then:
   netlify functions:invoke prisma-migrate
   # Or run manually:
   DATABASE_URL="your-url" npx prisma migrate deploy
   ```

2. **Create Admin User**
   - Use Prisma Studio or run a script:
   ```bash
   DATABASE_URL="your-url" node -e "
   const bcrypt = require('bcryptjs');
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   bcrypt.hash('your-secure-password', 10).then(hash => {
     prisma.user.create({
       data: {
         username: 'admin',
         email: 'admin@example.com',
         password: hash,
         role: 'admin'
       }
     }).then(() => {
       console.log('Admin user created');
       prisma.\$disconnect();
     });
   });
   "
   ```

3. **Verify Deployment**
   - Visit your Netlify site URL
   - Test the admin login
   - Add a test business
   - Verify all features work

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly in Netlify environment variables
- Check that your Neon database allows connections from Netlify IPs
- Ensure SSL mode is set to `require` in connection string

### Function Errors
- Check Netlify function logs in the dashboard
- Verify all dependencies are in `package.json` (not just `devDependencies`)
- Ensure Prisma Client is generated: `npm run prisma:generate`

### Build Errors
- Check that `node_modules` is not in `.gitignore` incorrectly
- Verify all environment variables are set
- Check build logs in Netlify dashboard

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## Support

For issues or questions:
- Check the [README.md](README.md) for general information
- Review Netlify function logs in the dashboard
- Check Neon database logs for connection issues

