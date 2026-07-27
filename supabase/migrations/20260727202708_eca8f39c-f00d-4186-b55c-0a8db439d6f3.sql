ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS appearance jsonb;
ALTER TABLE public.weekly_tasks ADD COLUMN IF NOT EXISTS source_note_id uuid;
ALTER TABLE public.weekly_tasks ADD COLUMN IF NOT EXISTS source_note_title text;
ALTER TABLE public.weekly_tasks ADD COLUMN IF NOT EXISTS source_notebook_title text;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_tasks TO authenticated;
GRANT ALL ON public.weekly_tasks TO service_role;