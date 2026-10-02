-- ============================================================================
-- MAILVEIL: COMPLETE CONSOLIDATED SUPABASE SCHEMA
-- Run this entire script in your new Supabase Project -> SQL Editor -> Run
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Table: profiles
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
    id uuid primary key default uuid_generate_v4(),
    email text not null unique,
    role text not null check (role in ('analyst', 'user')) default 'user',
    display_name text,
    avatar_url text,
    bio text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Pre-seed default accounts
insert into public.profiles (email, role, display_name, bio)
values 
    ('sentinelx.analyst@gmail.com', 'analyst', 'Sentinel Analyst', 'Cybersecurity Analyst & SOC Lead specializing in Mailveil forensic investigation and threat correlation.'),
    ('analyst@gmail.com', 'analyst', 'SOC Analyst', 'Tier 2 SOC Analyst specializing in email forensic investigation.'),
    ('demouser1@gmail.com', 'user', 'Demo User', 'Corporate enterprise user reporting suspicious emails.')
on conflict (email) do update 
set role = excluded.role,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Table: user_settings
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_settings (
    id uuid primary key default uuid_generate_v4(),
    user_email text not null unique,
    role text not null default 'user',
    theme_preset text default 'Dark Cyber',
    animations_enabled boolean default true,
    glow_effects boolean default true,
    email_notifications boolean default true,
    critical_alerts boolean default true,
    weekly_digest boolean default false,
    custom_ai_key text default '',
    active_ai_model text default 'gemini-3.6-flash',
    updated_at timestamptz not null default now()
);

insert into public.user_settings (user_email, role, theme_preset, animations_enabled, glow_effects, email_notifications, critical_alerts)
values
    ('sentinelx.analyst@gmail.com', 'analyst', 'Dark Cyber', true, true, true, true),
    ('demouser1@gmail.com', 'user', 'Dark Cyber', true, true, true, false)
on conflict (user_email) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Table: user_notifications
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_notifications (
    user_email text primary key,
    read_notification_ids jsonb default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Table: user_tickets (User "Check Status" <-> Analyst "User Requests")
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_tickets (
    id text primary key,
    user_email text not null,
    submitted_at timestamptz not null default now(),
    status text not null default 'pending' check (status in ('pending', 'in_review', 'analyzed', 'resolved', 'closed')),
    priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
    threat_category text default 'phishing',
    did_interact jsonb default '{}'::jsonb,
    user_comment text default '',
    eml_file jsonb,
    -- Analyst triage & response
    assigned_analyst text default 'sentinelx.analyst@gmail.com',
    verdict text,
    threat_score integer,
    analyst_comment text,
    recommended_action text,
    remediation_taken text,
    analyst_report jsonb,
    responded_at timestamptz,
    email_id text,
    -- User resolution & feedback
    user_acknowledged boolean default false,
    user_feedback text default '',
    user_rating integer default 0,
    closed_at timestamptz,
    -- Threaded conversation
    thread_messages jsonb default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Table: analyzed_reports (Analyst "Reports" & Forensic Results)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.analyzed_reports (
    case_id text primary key,
    verdict text not null default 'Suspicious',
    threat_score integer not null default 0,
    confidence integer not null default 85,
    summary text default '',
    analyzed_by text not null default 'sentinelx.analyst@gmail.com',
    report_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Table: campaigns (Analyst "Campaigns" Intelligence Clusters)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.campaigns (
    id text primary key,
    name text not null,
    threat_actor text default 'Unknown',
    status text not null default 'active',
    severity text not null default 'high',
    first_seen text,
    last_seen text,
    indicators_count integer default 0,
    description text default '',
    campaign_data jsonb not null default '{}'::jsonb,
    created_by text default 'sentinelx.analyst@gmail.com',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Table: alert_states (Analyst "Alerts" Triage & Case Status Overrides)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.alert_states (
    id text primary key default 'global_analyst_alerts',
    alert_status_overrides jsonb default '{}'::jsonb,
    case_status_overrides jsonb default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

insert into public.alert_states (id, alert_status_overrides, case_status_overrides)
values ('global_analyst_alerts', '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Tables for Automated Email Ingestion
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_emails (
    id uuid primary key default uuid_generate_v4(),
    user_email text not null,
    gmail_message_id text not null,
    thread_id text,
    sender text not null,
    sender_name text,
    recipient text not null,
    subject text not null,
    snippet text,
    body_text text,
    body_html text,
    headers jsonb default '{}'::jsonb,
    extracted_urls text[] default array[]::text[],
    is_read boolean default false,
    received_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint uq_user_gmail_msg unique (user_email, gmail_message_id)
);

create table if not exists public.email_threat_analyses (
    id uuid primary key default uuid_generate_v4(),
    email_id uuid not null references public.user_emails(id) on delete cascade,
    threat_level text not null check (threat_level in ('clean', 'suspicious', 'malicious')),
    threat_score integer not null check (threat_score >= 0 and threat_score <= 100),
    confidence integer not null check (confidence >= 0 and confidence <= 100),
    summary text not null,
    indicators jsonb default '[]'::jsonb,
    recommended_action text,
    model_used text not null default 'gemini-1.5-flash',
    is_reviewed boolean default false,
    escalated_to_soc boolean default false,
    analyzed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint uq_analysis_email unique (email_id)
);

create table if not exists public.email_sync_states (
    id uuid primary key default uuid_generate_v4(),
    user_email text not null unique,
    history_id text,
    last_synced_at timestamptz not null default now(),
    sync_status text not null default 'idle' check (sync_status in ('idle', 'syncing', 'error')),
    last_error text,
    total_emails_synced integer default 0,
    updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_user_settings_email on public.user_settings(user_email);
create index if not exists idx_user_tickets_user on public.user_tickets(user_email);
create index if not exists idx_user_tickets_status on public.user_tickets(status);
create index if not exists idx_user_tickets_priority on public.user_tickets(priority);
create index if not exists idx_analyzed_reports_score on public.analyzed_reports(threat_score desc);
create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_user_emails_user on public.user_emails(user_email);
create index if not exists idx_user_emails_received on public.user_emails(received_at desc);
create index if not exists idx_email_analyses_level on public.email_threat_analyses(threat_level);
create index if not exists idx_email_analyses_score on public.email_threat_analyses(threat_score desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) - Permissive for direct client access
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_notifications enable row level security;
alter table public.user_tickets enable row level security;
alter table public.analyzed_reports enable row level security;
alter table public.campaigns enable row level security;
alter table public.alert_states enable row level security;
alter table public.user_emails enable row level security;
alter table public.email_threat_analyses enable row level security;
alter table public.email_sync_states enable row level security;

create policy "Allow all profiles" on public.profiles for all using (true) with check (true);
create policy "Allow all user_settings" on public.user_settings for all using (true) with check (true);
create policy "Allow all user_notifications" on public.user_notifications for all using (true) with check (true);
create policy "Allow all user_tickets" on public.user_tickets for all using (true) with check (true);
create policy "Allow all analyzed_reports" on public.analyzed_reports for all using (true) with check (true);
create policy "Allow all campaigns" on public.campaigns for all using (true) with check (true);
create policy "Allow all alert_states" on public.alert_states for all using (true) with check (true);
create policy "Allow all user_emails" on public.user_emails for all using (true) with check (true);
create policy "Allow all email_threat_analyses" on public.email_threat_analyses for all using (true) with check (true);
create policy "Allow all email_sync_states" on public.email_sync_states for all using (true) with check (true);
