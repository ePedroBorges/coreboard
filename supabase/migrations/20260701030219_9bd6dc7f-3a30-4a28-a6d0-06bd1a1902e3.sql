ALTER TABLE public.weekly_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.weekly_tasks ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL;
ALTER TABLE public.task_pending_reasons ADD COLUMN IF NOT EXISTS description TEXT;