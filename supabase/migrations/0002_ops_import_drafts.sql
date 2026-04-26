create table if not exists public.ops_import_drafts (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null,
  import_mode text not null check (import_mode in ('manual', 'csv', 'pdf')),
  rows jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'finalized', 'abandoned')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ops_import_drafts_merchant_idx
  on public.ops_import_drafts (merchant_id, updated_at desc);
