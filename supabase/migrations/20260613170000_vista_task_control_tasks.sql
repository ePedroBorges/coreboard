-- Task manager enhancements for VISTA Task Control.
ALTER TABLE public.weekly_tasks
  ADD COLUMN IF NOT EXISTS assignee TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.weekly_tasks
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE public.weekly_tasks
SET status = 'pending'
WHERE status = 'added';

CREATE TABLE IF NOT EXISTS public.task_pending_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.weekly_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  responsible TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.task_pending_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own task pending reasons" ON public.task_pending_reasons;
DROP POLICY IF EXISTS "Users can insert own task pending reasons" ON public.task_pending_reasons;
DROP POLICY IF EXISTS "Users can update own task pending reasons" ON public.task_pending_reasons;
DROP POLICY IF EXISTS "Users can delete own task pending reasons" ON public.task_pending_reasons;

CREATE POLICY "Users can view own task pending reasons"
  ON public.task_pending_reasons
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task pending reasons"
  ON public.task_pending_reasons
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.weekly_tasks
      WHERE weekly_tasks.id = task_pending_reasons.task_id
      AND weekly_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own task pending reasons"
  ON public.task_pending_reasons
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task pending reasons"
  ON public.task_pending_reasons
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_task_pending_reasons_task_id
  ON public.task_pending_reasons(task_id);

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user_status
  ON public.weekly_tasks(user_id, status);
