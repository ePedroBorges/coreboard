alter table public.notebooks
  add column if not exists parent_id uuid null references public.notebooks(id) on delete cascade;

create index if not exists notebooks_parent_id_idx on public.notebooks(parent_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notebooks_parent_not_self'
  ) then
    alter table public.notebooks
      add constraint notebooks_parent_not_self check (parent_id is null or parent_id <> id);
  end if;
end $$;
