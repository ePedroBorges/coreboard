
-- ============================================================
-- Weekly tasks: add priority + progress tracking
-- ============================================================
ALTER TABLE public.weekly_tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS progress_current INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_target INTEGER;

ALTER TABLE public.weekly_tasks
  DROP CONSTRAINT IF EXISTS weekly_tasks_priority_check;
ALTER TABLE public.weekly_tasks
  ADD CONSTRAINT weekly_tasks_priority_check CHECK (priority IN ('low','medium','high'));

-- ============================================================
-- Pending reasons: add priority + progress
-- ============================================================
ALTER TABLE public.task_pending_reasons
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS progress_current INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_target INTEGER;

ALTER TABLE public.task_pending_reasons
  DROP CONSTRAINT IF EXISTS task_pending_reasons_priority_check;
ALTER TABLE public.task_pending_reasons
  ADD CONSTRAINT task_pending_reasons_priority_check CHECK (priority IN ('low','medium','high'));

-- ============================================================
-- Storage policies for the private "page-attachments" bucket
-- Users may only access files inside their own user_id folder.
-- ============================================================
DROP POLICY IF EXISTS "Users view own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users update own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own attachments" ON storage.objects;

CREATE POLICY "Users view own attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'page-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'page-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'page-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'page-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
