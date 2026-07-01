ALTER TABLE public.weekly_tasks
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.task_pending_reasons
  ADD COLUMN IF NOT EXISTS description TEXT;
