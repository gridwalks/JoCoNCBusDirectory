# Johnston County North Carolina Business Directory

A modern, full-stack business directory website for Johnston County, North Carolina, built with React, Netlify Functions, and Neon PostgreSQL.

## Features

- 🔍 **Search Functionality** - Full-text search across business names, descriptions, and categories
- 📂 **Categories & Filters** - Filter businesses by category
- 🗺️ **Interactive Map** - View businesses on an interactive map using Leaflet
- ⭐ **Reviews & Ratings** - Community-driven reviews and ratings system
- 📧 **Contact Forms** - Contact businesses directly through the website
- 🔐 **Admin Panel** - Manage businesses, categories, and view submissions

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Netlify Functions (Serverless)
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Maps**: Leaflet/React-Leaflet
- **Forms**: React Hook Form
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Neon PostgreSQL database
- Netlify account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd JoCoNCBusDirectory
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your:
- `NETLIFY_DATABASE_URL` - Your Neon PostgreSQL connection string (or `DATABASE_URL` for local dev)
- `JWT_SECRET` - A secret key for JWT authentication

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Create an admin user (you'll need to do this manually in the database or create a seed script):
```sql
INSERT INTO "User" (id, username, email, password, role) 
VALUES ('your-id', 'admin', 'admin@example.com', '<hashed-password>', 'admin');
```

To hash a password, you can use Node.js:
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('your-password', 10).then(console.log);
```

6. Run the development server:
```bash
npm run dev
```

7. For local Netlify Functions testing, install Netlify CLI:
```bash
npm install -g netlify-cli
netlify dev
```

## Project Structure

```
JoCoNCBusDirectory/
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── pages/              # Page components
│   └── services/           # API service layer
├── netlify/
│   └── functions/          # Netlify serverless functions
├── prisma/
│   └── schema.prisma       # Database schema
└── netlify.toml            # Netlify configuration
```

## Deployment

### Deploy to Netlify

1. Push your code to GitHub/GitLab/Bitbucket

2. Connect your repository to Netlify:
   - Go to [Netlify](https://app.netlify.com)
   - Click "New site from Git"
   - Select your repository

3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

4. Add environment variables in Netlify:
   - `NETLIFY_DATABASE_URL` - Your Neon PostgreSQL connection string (automatically created if using Netlify's Neon integration)
   - `JWT_SECRET` - Your JWT secret key

5. Deploy!

### Database Setup on Neon

1. Create a new project on [Neon](https://neon.tech)
2. Copy your connection string
3. Add it to your `.env` file and Netlify environment variables
4. Run migrations: `npx prisma migrate deploy`

## API Endpoints

### Public Endpoints

- `GET /.netlify/functions/businesses` - List all businesses
- `GET /.netlify/functions/business-detail?id={id}` - Get business details
- `GET /.netlify/functions/business-search?q={query}` - Search businesses
- `GET /.netlify/functions/categories` - List all categories
- `GET /.netlify/functions/reviews?businessId={id}` - Get reviews
- `POST /.netlify/functions/reviews` - Create review
- `POST /.netlify/functions/contact` - Submit contact form

### Admin Endpoints (Protected)

- `POST /.netlify/functions/auth-login` - Admin login
- `GET /.netlify/functions/admin/stats` - Get dashboard statistics
- `GET /.netlify/functions/admin/businesses` - List businesses (admin)
- `POST /.netlify/functions/admin/businesses` - Create business
- `PUT /.netlify/functions/admin/businesses?id={id}` - Update business
- `DELETE /.netlify/functions/admin/businesses?id={id}` - Delete business
- `GET /.netlify/functions/admin/contacts` - Get contact submissions

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npx prisma studio` - Open Prisma Studio to view/edit database
- `npx prisma migrate dev` - Create and apply migrations

## License

MIT
