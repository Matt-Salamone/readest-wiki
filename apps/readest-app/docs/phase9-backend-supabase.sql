-- Phase 9: Core app sync + files ledger for self-hosted Supabase (apply via Dashboard SQL editor or MCP execute_sql).
-- RLS: each row scoped to auth.uid() == user_id. Matches wiki-phase8-supabase.sql policy style.
--
-- Storage buckets (Supabase Storage) are separate — see phase9-backend-setup.md (`books`, `temp-images`).

-- books
CREATE TABLE IF NOT EXISTS public.books (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  book_hash text NOT NULL,
  meta_hash text,
  format text NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  group_id text,
  group_name text,
  tags jsonb DEFAULT '[]'::jsonb,
  progress jsonb,
  reading_status text,
  source_title text,
  metadata text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  uploaded_at timestamptz,
  PRIMARY KEY (user_id, book_hash)
);

CREATE INDEX IF NOT EXISTS idx_books_user_updated ON public.books (user_id, updated_at DESC);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY books_select ON public.books
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY books_insert ON public.books
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY books_update ON public.books
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY books_delete ON public.books
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- book_configs
CREATE TABLE IF NOT EXISTS public.book_configs (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  book_hash text NOT NULL,
  meta_hash text,
  location text,
  xpointer text,
  progress text,
  rsvp_position text,
  search_config text,
  view_settings text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, book_hash)
);

CREATE INDEX IF NOT EXISTS idx_book_configs_user_book_updated
  ON public.book_configs (user_id, book_hash, updated_at DESC);

ALTER TABLE public.book_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY book_configs_select ON public.book_configs
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY book_configs_insert ON public.book_configs
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY book_configs_update ON public.book_configs
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY book_configs_delete ON public.book_configs
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- book_notes
CREATE TABLE IF NOT EXISTS public.book_notes (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  book_hash text NOT NULL,
  id text NOT NULL,
  meta_hash text,
  type text NOT NULL,
  cfi text,
  xpointer0 text,
  xpointer1 text,
  page integer,
  "text" text,
  style text,
  color text,
  note text NOT NULL,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, book_hash, id)
);

CREATE INDEX IF NOT EXISTS idx_book_notes_user_book_updated
  ON public.book_notes (user_id, book_hash, updated_at DESC);

ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY book_notes_select ON public.book_notes
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY book_notes_insert ON public.book_notes
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY book_notes_update ON public.book_notes
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY book_notes_delete ON public.book_notes
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- files (storage ledger; blobs live in Supabase Storage or external object storage)
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  book_hash text,
  file_key text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS files_user_file_key_live
  ON public.files (user_id, file_key)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_files_user_book_live
  ON public.files (user_id, book_hash)
  WHERE deleted_at IS NULL;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY files_select ON public.files
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY files_insert ON public.files
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY files_update ON public.files
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY files_delete ON public.files
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
