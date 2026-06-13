
ALTER TABLE public.weekly_tasks
  ADD COLUMN IF NOT EXISTS assignee TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.task_pending_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.weekly_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  responsible TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_pending_reasons TO authenticated;
GRANT ALL ON public.task_pending_reasons TO service_role;

ALTER TABLE public.task_pending_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending reasons" ON public.task_pending_reasons
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pending reasons" ON public.task_pending_reasons
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending reasons" ON public.task_pending_reasons
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pending reasons" ON public.task_pending_reasons
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS task_pending_reasons_task_id_idx ON public.task_pending_reasons(task_id);
