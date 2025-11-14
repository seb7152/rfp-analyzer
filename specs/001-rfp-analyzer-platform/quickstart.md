# Quickstart Guide: RFP Analyzer Platform

**Date**: 2025-11-06  
**Feature**: RFP Analyzer Platform  
**Audience**: Developers setting up the project for the first time

## Overview

This guide walks you through setting up the RFP Analyzer Platform development environment from scratch. Expected time: 15-20 minutes.

---

## Prerequisites

Ensure you have the following installed:

- **Node.js**: 18.x or higher (LTS recommended)
- **npm**: 9.x or higher (comes with Node.js)
- **Git**: For version control
- **Supabase Account**: Free tier at [supabase.com](https://supabase.com)
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense

**Check versions**:

```bash
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

---

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd rfp-analyzer

# Checkout the feature branch
git checkout 001-rfp-analyzer-platform

# Install dependencies
npm install

# Expected output: ~200-300 packages installed
```

---

## Step 2: Set Up Supabase Project

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: RFP Analyzer Dev
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free
4. Wait 2-3 minutes for project to initialize

### 2.2 Get Project Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOi...` (long JWT token)
   - **Service Role Key**: `eyJhbGciOi...` (different JWT, keep secret!)

### 2.3 Install Supabase CLI

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or use npm
npm install -g supabase

# Verify installation
supabase --version
```

### 2.4 Link Local Project to Supabase

```bash
# Login to Supabase CLI
supabase login

# Link project (use project ref from dashboard URL)
supabase link --project-ref <your-project-ref>

# Example: supabase link --project-ref abcdefghijklmnop
```

---

## Step 3: Configure Environment Variables

Create `.env.local` file in the root directory:

```bash
# Copy template
cp .env.example .env.local

# Open in editor
code .env.local
```

Add your Supabase credentials:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your-service-role-key...

# Optional: For development
NODE_ENV=development
```

**⚠️ Important**:

- Never commit `.env.local` to Git (already in `.gitignore`)
- Anon key is safe for browser use
- Service role key must stay server-side only

---

## Step 4: Run Database Migrations

```bash
# Push the initial schema to Supabase
supabase db push

# Expected output:
# Applying migration 001_initial_schema.sql...
# Migration complete!

# Verify tables were created
supabase db diff
```

**Troubleshooting**:

- If `supabase db push` fails, check that you're linked to the correct project
- Try `supabase db reset` to start fresh (⚠️ destroys all data)

---

## Step 5: Seed Development Data (Optional)

```bash
# Run seed script to populate sample RFP
npm run seed

# This creates:
# - 1 RFP: "Infrastructure Cloud 2025"
# - 8 requirements (4-level hierarchy)
# - 4 suppliers
# - 32 responses (8 requirements × 4 suppliers)
```

**Verify in Supabase Dashboard**:

1. Go to **Table Editor**
2. Check `rfps`, `requirements`, `suppliers`, `responses` tables
3. Should see sample data

---

## Step 6: Generate TypeScript Types

```bash
# Generate types from Supabase schema
npm run generate-types

# This creates: lib/supabase/types.ts
# Types are auto-imported in components
```

**Verify**:

```typescript
// lib/supabase/types.ts should contain:
export type RFP = Database["public"]["Tables"]["rfps"]["Row"];
export type Requirement = Database["public"]["Tables"]["requirements"]["Row"];
// ...etc
```

---

## Step 7: Start Development Server

```bash
# Start Next.js dev server
npm run dev

# Expected output:
# ▲ Next.js 14.x.x
# - Local:   http://localhost:3000
# - ready in 2.1s
```

Open browser to [http://localhost:3000](http://localhost:3000)

**You should see**:

- Navbar with tabs: Configuration | Comparaison | Réponses
- Sidebar with requirements tree
- Main content area with comparison view

---

## Step 8: Verify Setup

### Test Navigation

1. Click "Expand All" in sidebar → tree fully expands
2. Select "REQ-001" → supplier responses load
3. Click star rating → manual score updates
4. Toggle theme → dark/light mode switches

### Test API Routes

```bash
# Get RFP data
curl http://localhost:3000/api/rfps/<rfp-id>

# Get requirements
curl http://localhost:3000/api/rfps/<rfp-id>/requirements

# Get responses
curl http://localhost:3000/api/rfps/<rfp-id>/responses
```

Replace `<rfp-id>` with actual UUID from seed data (check Supabase dashboard).

---

## Step 9: Run Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Expected output:
# PASS tests/unit/components/Sidebar.test.tsx
# PASS tests/unit/hooks/use-requirements.test.ts
# PASS tests/e2e/evaluation-flow.spec.ts
# Test Suites: 15 passed, 15 total
```

---

## Project Structure

```
rfp-analyzer/
├── app/                     # Next.js App Router
│   ├── api/                # API routes
│   ├── dashboard/          # Main evaluation UI
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                # shadcn/ui primitives
│   ├── Navbar.tsx         # Top navigation
│   ├── Sidebar.tsx        # Requirements tree
│   └── ComparisonView.tsx # Main comparison UI
├── lib/                    # Utilities and clients
│   ├── supabase/          # Supabase client and queries
│   └── utils.ts           # Helper functions
├── hooks/                  # React custom hooks
├── types/                  # TypeScript type definitions
├── supabase/              # Database migrations
│   └── migrations/
├── tests/                  # Test files
├── .env.local             # Environment variables (you create)
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── package.json           # Dependencies
```

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Database
npm run migrate          # Run new migrations
npm run seed             # Seed development data
npm run generate-types   # Generate TypeScript types from schema

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run end-to-end tests
npm run test:coverage    # Generate coverage report

# Supabase
supabase db reset        # Reset database (⚠️ destroys data)
supabase db diff         # Show pending migrations
supabase db push         # Apply migrations to remote
supabase db pull         # Pull schema changes from remote
```

---

## Troubleshooting

### Issue: "Module not found" errors

**Solution**:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Supabase connection fails

**Checklist**:

- ✅ Correct URL and anon key in `.env.local`
- ✅ Supabase project is not paused (dashboard shows "Active")
- ✅ Migrations have been applied (`supabase db push`)
- ✅ No firewall blocking `*.supabase.co`

**Test connection**:

```bash
curl https://xxxxx.supabase.co/rest/v1/
# Should return: {"msg":"ok","details":"API is ready","hint":null}
```

### Issue: Dark mode not working

**Checklist**:

- ✅ `next-themes` installed: `npm list next-themes`
- ✅ ThemeProvider in `app/layout.tsx`
- ✅ `dark:` classes in components
- ✅ No conflicting `color-scheme` CSS

**Force dark mode**:

```javascript
// In browser console
document.documentElement.classList.add("dark");
```

### Issue: Types not found after migration

**Solution**:

```bash
npm run generate-types
# Restart TypeScript server in VS Code: Cmd+Shift+P → "Restart TS Server"
```

### Issue: Port 3000 already in use

**Solution**:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

---

## Next Steps

After setup is complete:

1. **Explore the code**: Start with `app/dashboard/page.tsx`
2. **Read the spec**: Review `specs/001-rfp-analyzer-platform/spec.md`
3. **Check data model**: See `specs/001-rfp-analyzer-platform/data-model.md`
4. **Review API contracts**: See `specs/001-rfp-analyzer-platform/contracts/api.yaml`
5. **Run through user stories**: Follow acceptance scenarios from spec
6. **Start implementing tasks**: See `specs/001-rfp-analyzer-platform/tasks.md` (after `/speckit.tasks`)

---

## Development Workflow

### Making Changes

1. **Create a new component**:

```bash
# Use shadcn/ui CLI to add primitives
npx shadcn-ui@latest add <component-name>

# Or create custom component in components/
touch components/MyComponent.tsx
```

2. **Add a new API route**:

```bash
mkdir -p app/api/my-endpoint
touch app/api/my-endpoint/route.ts
```

3. **Create a database migration**:

```bash
# Create new migration file
supabase migration new my_migration_name

# Edit: supabase/migrations/00X_my_migration_name.sql
# Apply: supabase db push
```

### Testing Workflow

1. Write test first (TDD approach)
2. Run test (should fail): `npm run test:watch`
3. Implement feature
4. Test passes
5. Refactor if needed
6. Commit

### Git Workflow

```bash
# Make sure you're on the feature branch
git checkout 001-rfp-analyzer-platform

# Create commits with descriptive messages
git add .
git commit -m "feat: add requirement completion badges"

# Push to remote
git push origin 001-rfp-analyzer-platform
```

---

## Resources

### Documentation

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [React Query Docs](https://tanstack.com/query/latest)

### Project Docs

- [Feature Specification](./spec.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/api.yaml)
- [Research Notes](./research.md)

### Support

- **Issues**: Report bugs in GitHub Issues
- **Questions**: Ask in team Slack channel
- **Code Review**: Submit PR for feedback

---

## Production Deployment

### Vercel Deployment

1. **Connect GitHub repo**:
   - Go to [vercel.com](https://vercel.com)
   - Import Git repository
   - Select `rfp-analyzer` repo

2. **Configure environment variables**:
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add `SUPABASE_SERVICE_ROLE_KEY`

3. **Deploy**:
   - Vercel auto-deploys on push to main branch
   - Preview deployments for PRs
   - Production URL: `rfp-analyzer.vercel.app`

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Build succeeds locally: `npm run build`
- [ ] Environment variables configured in Vercel
- [ ] Supabase production database migrated
- [ ] No console errors in browser
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices)

---

## Conclusion

You should now have a fully functional local development environment for the RFP Analyzer Platform. If you encounter issues not covered in this guide, check the troubleshooting section or reach out to the team.

**Happy coding! 🚀**
