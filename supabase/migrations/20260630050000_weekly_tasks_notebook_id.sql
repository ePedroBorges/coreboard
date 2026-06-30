-- Link weekly tasks to notebooks without forcing a destructive backfill.
ALTER TABLE public.weekly_tasks
  ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_notebook_id
  ON public.weekly_tasks(notebook_id);
