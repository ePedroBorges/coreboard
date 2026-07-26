-- Durable, per-user appearance preferences. The JSON snapshot keeps all related
-- options together while the existing profile RLS policies restrict access to its owner.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS appearance JSONB;

COMMENT ON COLUMN public.profiles.appearance IS
  'CoreBoard appearance snapshot: mode, color scheme, visual theme, font, effects and updatedAt.';
