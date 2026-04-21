-- Phase 8: Wiki sync tables for self-hosted Supabase (apply via Dashboard SQL editor or MCP execute_sql).
-- RLS: each row scoped to auth.uid() == user_id. UPDATE requires SELECT policy (Postgres RLS).

-- wiki_namespaces (no spoiler_override — device-local only in SQLite)
CREATE TABLE IF NOT EXISTS public.wiki_namespaces (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  imported_mode integer NOT NULL DEFAULT 0,
  book_hashes_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_namespaces_user_updated ON public.wiki_namespaces (user_id, updated_at DESC);

ALTER TABLE public.wiki_namespaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY wiki_namespaces_select ON public.wiki_namespaces
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_namespaces_insert ON public.wiki_namespaces
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_namespaces_update ON public.wiki_namespaces
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_namespaces_delete ON public.wiki_namespaces
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- wiki_pages
CREATE TABLE IF NOT EXISTS public.wiki_pages (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id text NOT NULL,
  namespace_id text NOT NULL,
  title text NOT NULL,
  title_slug text NOT NULL,
  page_type text,
  summary_markdown text NOT NULL DEFAULT '',
  first_seen_cfi text,
  first_seen_book_hash text,
  is_ghost integer NOT NULL DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS wiki_pages_user_namespace_slug_live
  ON public.wiki_pages (user_id, namespace_id, title_slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wiki_pages_user_namespace ON public.wiki_pages (user_id, namespace_id);

ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY wiki_pages_select ON public.wiki_pages
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_pages_insert ON public.wiki_pages
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_pages_update ON public.wiki_pages
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_pages_delete ON public.wiki_pages
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- wiki_blocks
CREATE TABLE IF NOT EXISTS public.wiki_blocks (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id text NOT NULL,
  page_id text NOT NULL,
  book_hash text NOT NULL,
  cfi text NOT NULL,
  xpointer0 text,
  xpointer1 text,
  quote_text text,
  note_markdown text,
  tags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_blocks_user_page ON public.wiki_blocks (user_id, page_id);

ALTER TABLE public.wiki_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY wiki_blocks_select ON public.wiki_blocks
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_blocks_insert ON public.wiki_blocks
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_blocks_update ON public.wiki_blocks
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_blocks_delete ON public.wiki_blocks
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- wiki_tags
CREATE TABLE IF NOT EXISTS public.wiki_tags (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id text NOT NULL,
  namespace_id text NOT NULL,
  tag_name text NOT NULL,
  built_in_type text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, namespace_id, tag_name)
);

ALTER TABLE public.wiki_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY wiki_tags_select ON public.wiki_tags
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_tags_insert ON public.wiki_tags
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_tags_update ON public.wiki_tags
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_tags_delete ON public.wiki_tags
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- wiki_links (source_block_id '' = page summary links)
CREATE TABLE IF NOT EXISTS public.wiki_links (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_page_id text NOT NULL,
  target_page_id text NOT NULL,
  source_block_id text NOT NULL DEFAULT '',
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, source_page_id, target_page_id, source_block_id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_links_user_target ON public.wiki_links (user_id, target_page_id);

ALTER TABLE public.wiki_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY wiki_links_select ON public.wiki_links
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_links_insert ON public.wiki_links
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_links_update ON public.wiki_links
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_links_delete ON public.wiki_links
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- wiki_section_catalog (per-user mirror of global SQLite catalog)
CREATE TABLE IF NOT EXISTS public.wiki_section_catalog (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS wiki_section_catalog_user_name_live
  ON public.wiki_section_catalog (user_id, name)
  WHERE deleted_at IS NULL;

ALTER TABLE public.wiki_section_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY wiki_section_catalog_select ON public.wiki_section_catalog
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_section_catalog_insert ON public.wiki_section_catalog
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_section_catalog_update ON public.wiki_section_catalog
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY wiki_section_catalog_delete ON public.wiki_section_catalog
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
