
-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('added', 'completed', 'pending');

-- Create weekly_tasks table
CREATE TABLE public.weekly_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  task_date DATE NOT NULL,
  status task_status NOT NULL DEFAULT 'added',
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own tasks" ON public.weekly_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.weekly_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.weekly_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.weekly_tasks FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_weekly_tasks_updated_at
  BEFORE UPDATE ON public.weekly_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
