# ExecutiveAI Pro - Replit Setup Guide

## ✅ Already Completed

The following setup steps have been completed automatically:

1. ✅ **Node.js Dependencies Installed** - All 991 npm packages installed successfully
2. ✅ **JWT_SECRET Generated** - Secure JWT secret configured in environment variables
3. ✅ **Workflow Configured** - "Start application" workflow running on port 5000
4. ✅ **Vite Configuration** - Properly configured for Replit environment (host: 0.0.0.0, port: 5000, allowedHosts: all)
5. ✅ **Frontend Running** - React app loading successfully with login page
6. ✅ **Backend Running** - Express server with Vite middleware integration
7. ✅ **Deployment Configured** - Autoscale deployment ready for production

## ⚠️ Required: Database Setup

To complete the setup, you need to create a PostgreSQL database:

### Step 1: Create Database
1. Click on the **"Database"** tab in the left sidebar of Replit
2. Click **"Create PostgreSQL Database"**
3. Wait for the database to be provisioned (this creates the DATABASE_URL environment variable automatically)

### Step 2: Initialize Database Tables
After the database is created, run this command in the Shell:

```bash
npm run db:push
```

This will create all 63 required tables in your database.

### Step 3: Restart the Application
The workflow should restart automatically, but if not, use:

```bash
npm run dev
```

## 🔐 Default Login Credentials

After the database is set up, you can log in with:

- **Email:** admin@example.com
- **Password:** Check the server logs for the auto-generated password

Look for a message like "Generated default password: [password]" in the workflow logs.

## 🎯 Optional Integrations

All these can be configured later through the UI at `/configuracoes`:

- **Supabase** - External database for forms and workspace data
- **Redis** - Caching (currently using in-memory cache)
- **WhatsApp/Evolution API** - WhatsApp Business integration
- **Google Calendar** - Calendar synchronization
- **Pluggy Banking** - Banking integrations
- **Sentry** - Error monitoring
- **Resend** - Email delivery

## 🚀 Next Steps After Database Setup

1. Log in to the application
2. Change the default password
3. Configure optional integrations via UI
4. Explore the features:
   - Executive Dashboard
   - Workspace (Notion-style)
   - Label Designer
   - Client Management
   - Forms System
   - WhatsApp Integration (after configuration)

## 📖 Additional Documentation

- **README.md** - Full project documentation
- **replit.md** - Current configuration and architecture
- **DOCUMENTATION.md** - Technical documentation
- **SUPABASE_SETUP_REQUIRED.md** - Supabase setup guide (if needed)

## 🔧 Troubleshooting

### Database connection errors?
- Make sure you created the PostgreSQL database in the Database tab
- Verify DATABASE_URL is set: `echo $DATABASE_URL` in Shell
- Run migrations: `npm run db:push`

### Frontend not loading?
- Check that the workflow "Start application" is running
- The application runs on port 5000

### Can't log in?
- Database must be created and initialized first
- Check server logs for the auto-generated password
- Default email: admin@example.com
