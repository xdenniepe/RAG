create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null,
   source_type text not null check (source_type in ('ops', 'restaurant')),
  file_name text not null,
  mime_type text not null,
  checksum text not null,
  document_type text,
  file_size bigint,
  storage_path text,
  uploaded_by text,
  created_by text,
  visibility_scope text not null default 'merchant_private',
  status text not null default 'pending',
  normalization_version text,
  chunking_version text,
  embedding_model text,
  embedding_dimensions integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extracted_blocks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  merchant_id text not null,
  source_type text not null check (source_type in ('ops', 'restaurant')),
  page_number integer,
  block_index integer not null default 0,
  raw_text text not null,
  block_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.normalized_sections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  merchant_id text not null,
  source_type text not null check (source_type in ('ops', 'restaurant')),
  section_title text,
  section_text text not null,
  section_order integer not null default 0,
  normalization_version text not null default 'v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  merchant_id text not null,
  source_type text not null check (source_type in ('ops', 'restaurant')),
  section_id uuid references public.normalized_sections(id) on delete set null,
  chunk_text text,
  content text not null,
  chunk_index integer not null,
  token_count integer not null,
  section_title text,
  page_number integer,
  chunking_version text,
  embedding_model text,
  embedding_dimensions integer,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurant_profiles (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null unique,
  restaurant_name text not null,
  brand_story text,
  cuisine_type text,
  tone_of_voice text,
  target_audience text,
  price_positioning text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null,
  name text not null,
  description text,
  category text,
  ingredients text,
  spice_level text,
  richness_level text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.documents(id) on delete set null,
  merchant_id text not null,
  name text not null,
  producer text,
  region text,
  country text,
  grape_varietal text,
  vintage text,
  style text,
  body text,
  acidity text,
  tasting_notes text,
  approved_claims text,
  price_band text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wine_pairing_rules (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid not null references public.wines(id) on delete cascade,
  pair_with text,
  avoid_with text,
  pairing_rationale text,
  confidence_level text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_merchant_source_idx
  on public.documents (merchant_id, source_type);

create index if not exists extracted_blocks_document_idx
  on public.extracted_blocks (document_id);

create index if not exists extracted_blocks_merchant_source_idx
  on public.extracted_blocks (merchant_id, source_type);

create index if not exists normalized_sections_document_idx
  on public.normalized_sections (document_id, section_order);

create index if not exists normalized_sections_merchant_source_idx
  on public.normalized_sections (merchant_id, source_type);

create index if not exists chunks_document_idx
  on public.document_chunks (document_id);

create index if not exists chunks_merchant_source_idx
  on public.document_chunks (merchant_id, source_type);

create index if not exists document_chunks_section_idx
  on public.document_chunks (section_id);

create index if not exists document_chunks_merchant_source_document_idx
  on public.document_chunks (merchant_id, source_type, document_id);

create index if not exists document_chunks_embedding_hnsw_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

create index if not exists restaurant_profiles_merchant_idx
  on public.restaurant_profiles (merchant_id);

create index if not exists menu_items_merchant_idx
  on public.menu_items (merchant_id);

create index if not exists wines_merchant_idx
  on public.wines (merchant_id);

create index if not exists wines_source_document_idx
  on public.wines (source_document_id);

create index if not exists wine_pairing_rules_wine_idx
  on public.wine_pairing_rules (wine_id);

drop function if exists public.insert_document_chunk(
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  jsonb,
  text
);

drop function if exists public.match_document_chunks(
  text,
  integer,
  text,
  text[]
);

drop function if exists public.insert_document_chunk_v2(
  uuid,
  text,
  text,
  uuid,
  text,
  integer,
  integer,
  jsonb,
  text,
  text,
  text,
  integer,
  text,
  integer
);

drop function if exists public.match_document_chunks_v2(
  text,
  integer,
  text,
  text[]
);

create or replace function public.insert_document_chunk(
  p_document_id uuid,
  p_merchant_id text,
  p_source_type text,
  p_content text,
  p_chunk_index integer,
  p_token_count integer,
  p_metadata jsonb,
  p_embedding_text text
)
returns uuid
language plpgsql
security definer
as $func$
declare
  inserted_id uuid;
begin
  insert into public.document_chunks (
    document_id,
    merchant_id,
    source_type,
    content,
    chunk_text,
    chunk_index,
    token_count,
    metadata,
    embedding
  )
  values (
    p_document_id,
    p_merchant_id,
    p_source_type,
    p_content,
    p_content,
    p_chunk_index,
    p_token_count,
    coalesce(p_metadata, '{}'::jsonb),
    p_embedding_text::vector
  )
  returning id into inserted_id;

  return inserted_id;
end;
$func$;

create or replace function public.match_document_chunks(
  p_query_embedding_text text,
  p_match_count integer,
  p_merchant_id text,
  p_source_types text[]
)
returns table (
  id uuid,
  document_id uuid,
  file_name text,
  source_type text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $func$
  select
    dc.id,
    dc.document_id,
    d.file_name,
    dc.source_type,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> p_query_embedding_text::vector) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.merchant_id = p_merchant_id
    and dc.source_type = any (p_source_types)
  order by dc.embedding <=> p_query_embedding_text::vector
  limit p_match_count;
$func$;

create or replace function public.insert_document_chunk_v2(
  p_document_id uuid,
  p_merchant_id text,
  p_source_type text,
  p_section_id uuid,
  p_content text,
  p_chunk_index integer,
  p_token_count integer,
  p_metadata jsonb,
  p_embedding_text text,
  p_chunking_version text,
  p_embedding_model text,
  p_embedding_dimensions integer,
  p_section_title text,
  p_page_number integer
)
returns uuid
language plpgsql
security definer
as $func$
declare
  inserted_id uuid;
begin
  insert into public.document_chunks (
    document_id,
    merchant_id,
    source_type,
    section_id,
    content,
    chunk_text,
    chunk_index,
    token_count,
    metadata,
    embedding,
    chunking_version,
    embedding_model,
    embedding_dimensions,
    section_title,
    page_number
  )
  values (
    p_document_id,
    p_merchant_id,
    p_source_type,
    p_section_id,
    p_content,
    p_content,
    p_chunk_index,
    p_token_count,
    coalesce(p_metadata, '{}'::jsonb),
    p_embedding_text::vector,
    p_chunking_version,
    p_embedding_model,
    p_embedding_dimensions,
    p_section_title,
    p_page_number
  )
  returning id into inserted_id;

  return inserted_id;
end;
$func$;

create or replace function public.match_document_chunks_v2(
  p_query_embedding_text text,
  p_match_count integer,
  p_merchant_id text,
  p_source_types text[]
)
returns table (
  id uuid,
  document_id uuid,
  file_name text,
  source_type text,
  content text,
  metadata jsonb,
  section_title text,
  page_number integer,
  similarity float
)
language sql
stable
as $func$
  select
    dc.id,
    dc.document_id,
    d.file_name,
    dc.source_type,
    coalesce(dc.chunk_text, dc.content) as content,
    dc.metadata,
    dc.section_title,
    dc.page_number,
    1 - (dc.embedding <=> p_query_embedding_text::vector) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.merchant_id = p_merchant_id
    and dc.source_type = any (p_source_types)
  order by dc.embedding <=> p_query_embedding_text::vector
  limit p_match_count;
$func$;
