alter table public.weekly_tasks
  add column if not exists source_note_id uuid null references public.pages(id) on delete set null,
  add column if not exists source_note_title text null,
  add column if not exists source_notebook_title text null;

create index if not exists weekly_tasks_source_note_id_idx
  on public.weekly_tasks(source_note_id);
