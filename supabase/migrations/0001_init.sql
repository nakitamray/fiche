-- fiche: recipes as a commit DAG, with flavor vectors for the map.
-- Mirrors src/lib/ast.ts. Recipe bodies stay as jsonb (they're validated by
-- the zod schema on the way in); the graph structure is relational.

create extension if not exists vector;

create table repositories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  slug        text not null,
  head        text not null default 'main',
  linen       text not null default 'linen',
  plate       text not null default 'plain',
  pastry      text not null default 'slab',
  stamp       text check (stamp in ('tested', 'house special', 'sold out')),
  draft       jsonb,
  created_at  timestamptz not null default now(),
  unique (owner_id, slug)
);

create table commits (
  hash          text not null,
  repository_id uuid not null references repositories (id) on delete cascade,
  branch        text not null,
  message       text not null,
  recipe        jsonb not null,
  crumb_score   numeric(2, 1) check (crumb_score between 0 and 5),
  tasting_notes text,
  baked_on      date,
  created_at    timestamptz not null default now(),
  -- 8 flavor axes + 4 structural ratios, see src/lib/flavor.ts
  flavor        vector(12),
  primary key (repository_id, hash)
);

-- merge commits have two parents, so parents get their own table
create table commit_parents (
  repository_id uuid not null,
  child_hash    text not null,
  parent_hash   text not null,
  position      smallint not null default 0,
  primary key (repository_id, child_hash, position),
  foreign key (repository_id, child_hash) references commits (repository_id, hash) on delete cascade,
  foreign key (repository_id, parent_hash) references commits (repository_id, hash) on delete cascade
);

create table branches (
  repository_id uuid not null references repositories (id) on delete cascade,
  name          text not null,
  tip_hash      text not null,
  primary key (repository_id, name),
  foreign key (repository_id, tip_hash) references commits (repository_id, hash)
);

create index commits_flavor_idx on commits using hnsw (flavor vector_cosine_ops);
create index commits_repo_created_idx on commits (repository_id, created_at desc);

-- nearest bakes by flavor, across everything the user owns
create or replace function similar_bakes(target vector(12), max_results int default 6)
returns table (repository_id uuid, hash text, similarity float)
language sql stable
as $$
  select c.repository_id, c.hash, 1 - (c.flavor <=> target) as similarity
  from commits c
  join repositories r on r.id = c.repository_id
  where r.owner_id = auth.uid() and c.flavor is not null
  order by c.flavor <=> target
  limit max_results;
$$;

-- row level security: you only ever see your own kitchen
alter table repositories enable row level security;
alter table commits enable row level security;
alter table commit_parents enable row level security;
alter table branches enable row level security;

create policy "own repositories" on repositories
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own commits" on commits
  for all using (exists (select 1 from repositories r where r.id = repository_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from repositories r where r.id = repository_id and r.owner_id = auth.uid()));

create policy "own parents" on commit_parents
  for all using (exists (select 1 from repositories r where r.id = repository_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from repositories r where r.id = repository_id and r.owner_id = auth.uid()));

create policy "own branches" on branches
  for all using (exists (select 1 from repositories r where r.id = repository_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from repositories r where r.id = repository_id and r.owner_id = auth.uid()));
