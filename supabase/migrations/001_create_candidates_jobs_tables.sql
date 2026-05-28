-- Create candidates table
create table if not exists public.candidates (
  id uuid default gen_random_uuid() primary key,
  test_id text not null unique,
  full_name text not null,
  email text not null,
  final_score numeric default 0,
  coding_score numeric default 0,
  penalty_score numeric default 0,
  decision text default 'PENDING',
  suggested_role text,
  resume_text text,
  ai_evaluation jsonb,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create jobs table
create table if not exists public.jobs (
  id uuid default gen_random_uuid() primary key,
  role text not null,
  description text not null,
  requirements text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better query performance
create index if not exists candidates_test_id_idx on public.candidates(test_id);
create index if not exists candidates_email_idx on public.candidates(email);
create index if not exists candidates_completed_at_idx on public.candidates(completed_at);
create index if not exists jobs_created_at_idx on public.jobs(created_at);

-- Enable Row Level Security
alter table public.candidates enable row level security;
alter table public.jobs enable row level security;

-- Create basic RLS policies (allow all for now - update based on your auth needs)
create policy "Allow all access to candidates" on public.candidates
  for all using (true) with check (true);

create policy "Allow all access to jobs" on public.jobs
  for all using (true) with check (true);
