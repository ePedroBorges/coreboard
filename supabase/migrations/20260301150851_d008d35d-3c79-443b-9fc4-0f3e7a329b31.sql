
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Notebooks table
CREATE TABLE public.notebooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Notebook',
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notebooks" ON public.notebooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notebooks" ON public.notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notebooks" ON public.notebooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notebooks" ON public.notebooks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON public.notebooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pages table
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Page',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pages" ON public.pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pages" ON public.pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pages" ON public.pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pages" ON public.pages FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Page tags junction
CREATE TABLE public.page_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE(page_id, tag_id)
);
ALTER TABLE public.page_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own page_tags" ON public.page_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pages WHERE pages.id = page_tags.page_id AND pages.user_id = auth.uid())
);
CREATE POLICY "Users can insert own page_tags" ON public.page_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pages WHERE pages.id = page_tags.page_id AND pages.user_id = auth.uid())
);
CREATE POLICY "Users can delete own page_tags" ON public.page_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.pages WHERE pages.id = page_tags.page_id AND pages.user_id = auth.uid())
);

-- Page versions
CREATE TABLE public.page_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own page_versions" ON public.page_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pages WHERE pages.id = page_versions.page_id AND pages.user_id = auth.uid())
);
CREATE POLICY "Users can insert own page_versions" ON public.page_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pages WHERE pages.id = page_versions.page_id AND pages.user_id = auth.uid())
);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('drawings', 'drawings', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('page-images', 'page-images', true);

-- Storage policies
CREATE POLICY "Drawings are publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'drawings');
CREATE POLICY "Users can upload drawings" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'drawings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update drawings" ON storage.objects FOR UPDATE USING (bucket_id = 'drawings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete drawings" ON storage.objects FOR DELETE USING (bucket_id = 'drawings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Page images are publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'page-images');
CREATE POLICY "Users can upload page images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'page-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update page images" ON storage.objects FOR UPDATE USING (bucket_id = 'page-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete page images" ON storage.objects FOR DELETE USING (bucket_id = 'page-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX idx_pages_notebook_id ON public.pages(notebook_id);
CREATE INDEX idx_pages_user_id ON public.pages(user_id);
CREATE INDEX idx_pages_is_favorite ON public.pages(user_id, is_favorite);
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_page_versions_page_id ON public.page_versions(page_id);
