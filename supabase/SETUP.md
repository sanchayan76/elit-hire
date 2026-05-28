# Supabase Integration Setup Guide

This app now integrates Supabase as a backend for storing candidate assessment data. Follow these steps to set up Supabase for your deployment.

## Prerequisites

- A Supabase account (free tier is sufficient for development)
- Your Supabase project URL and anon key

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Note your project URL and anon key from the API settings

## Step 2: Update Environment Variables

Update your `.env` file with the Supabase credentials:

```env
VITE_SUPABASE_URL="your_project_url"
VITE_SUPABASE_ANON_KEY="your_anon_key"
```

## Step 3: Run Database Migrations

There are two ways to set up the database schema:

### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/001_create_candidates_jobs_tables.sql`
4. Paste and execute in the SQL Editor

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link your project
supabase link --project-ref your_project_ref

# Run migrations
supabase db push
```

## Step 4: Verify Setup

The migration creates two main tables:

### `candidates` Table
- `id` (UUID, primary key)
- `test_id` (TEXT, unique) - Unique test identifier
- `full_name` (TEXT) - Candidate's full name
- `email` (TEXT) - Candidate's email
- `final_score` (NUMERIC) - Final assessment score
- `coding_score` (NUMERIC) - Coding challenge score
- `penalty_score` (NUMERIC) - Penalties applied
- `decision` (TEXT) - PASS/FAIL/REVIEW
- `suggested_role` (TEXT) - AI-suggested job role
- `completed_at` (TIMESTAMPTZ) - When the test was completed
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record update timestamp

### `jobs` Table
- `id` (UUID, primary key)
- `role` (TEXT) - Job title/role
- `description` (TEXT) - Job description
- `requirements` (TEXT[]) - Array of job requirements
- `created_at` (TIMESTAMPTZ) - Job creation timestamp
- `updated_at` (TIMESTAMPTZ) - Job update timestamp

## Data Flow

The application uses a fallback strategy for data persistence:

1. **Primary**: Supabase (cloud database)
2. **Secondary**: System backend API (localhost:5000)
3. **Tertiary**: Browser localStorage (client-side)

When a candidate applies or completes a test:
1. Data is saved to Supabase first
2. Simultaneously saved to the backend API if available
3. Always saved to localStorage for immediate access

When loading data (Admin dashboard):
1. First tries to load from Supabase
2. Falls back to backend API if Supabase unavailable
3. Uses localStorage as last resort
4. Automatically syncs data to Supabase from other sources

## Features

### Automatic Data Migration
When you switch to Supabase, the app automatically migrates data from:
- Backend API
- Browser localStorage

### Real-time Sync
- All new candidates are saved to Supabase
- All test results are updated in Supabase
- Admin operations sync to Supabase

### RLS Policies
Currently, Row Level Security (RLS) allows all authenticated users to access the data. You can customize this in the Supabase dashboard under Table Auth Policies based on your requirements.

## File Structure

```
src/integrations/supabase/
├── client.ts                 # Supabase client and API operations
├── types.ts (optional)       # TypeScript types for DB records

supabase/
├── config.toml              # Supabase CLI configuration
└── migrations/
    └── 001_create_candidates_jobs_tables.sql  # Database schema
```

## API Operations

The Supabase client exports the following operations:

### Candidate Operations
```typescript
import { candidateOperations } from "@/integrations/supabase/client";

// Create
await candidateOperations.create(candidateData);

// Get all
const candidates = await candidateOperations.getAll();

// Get by test ID
const candidate = await candidateOperations.getById(testId);

// Update
await candidateOperations.update(testId, updates);

// Delete
await candidateOperations.delete(testId);
```

### Job Operations
```typescript
import { jobOperations } from "@/integrations/supabase/client";

// Create
await jobOperations.create(jobData);

// Get all
const jobs = await jobOperations.getAll();

// Delete
await jobOperations.delete(id);

// Update
await jobOperations.update(id, updates);
```

## Troubleshooting

### "Supabase anon key is not configured"
- Ensure `.env` file has `VITE_SUPABASE_ANON_KEY` set
- Restart the development server after updating `.env`

### Connection errors
- Verify the project URL is correct
- Check that the anon key is valid
- Ensure your Supabase project is active

### Migration failed
- Check that the SQL syntax is correct
- Verify you're using the correct Supabase project
- Try running migrations through the dashboard instead of CLI

### Data not syncing
- Check browser console for error messages
- Verify RLS policies allow the operations
- Ensure the Supabase client is initialized correctly

## Security Considerations

1. **API Keys**: Keep your anon key secure. It's safe to expose in client-side code as it has limited permissions.
2. **RLS Policies**: Currently set to allow all access. Implement proper authentication and RLS policies for production.
3. **Data Privacy**: Consider adding GDPR compliance features for candidate data.

## Next Steps

1. Implement authentication (Supabase Auth)
2. Add RLS policies based on user roles
3. Set up backup policies
4. Monitor usage in the Supabase dashboard
5. Consider setting up real-time subscriptions for live updates

## Support

For Supabase documentation: [docs.supabase.com](https://docs.supabase.com)
