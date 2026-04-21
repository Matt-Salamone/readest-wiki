export interface DBBook {
  user_id: string;
  book_hash: string;
  meta_hash?: string;
  format: string;
  title: string;
  source_title?: string;
  author: string;
  group_id?: string;
  group_name?: string;
  tags?: string[];
  progress?: [number, number];
  reading_status?: string;

  metadata?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  uploaded_at?: string | null;
}

export interface DBBookConfig {
  user_id: string;
  book_hash: string;
  meta_hash?: string;
  location?: string;
  xpointer?: string;
  progress?: string;
  rsvp_position?: string;
  search_config?: string;
  view_settings?: string;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DBBookNote {
  user_id: string;
  book_hash: string;
  meta_hash?: string;
  id: string;
  type: string;
  cfi?: string;
  xpointer0?: string;
  xpointer1?: string;
  page?: number;
  text?: string;
  style?: string;
  color?: string;
  note: string;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/** Supabase wiki sync (Phase 8). Timestamps are ISO strings from PostgREST. */
export interface DBWikiNamespace {
  user_id: string;
  id: string;
  kind: string;
  title: string;
  imported_mode: number;
  book_hashes_json: unknown;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DBWikiPage {
  user_id: string;
  id: string;
  namespace_id: string;
  title: string;
  title_slug: string;
  page_type?: string | null;
  summary_markdown: string;
  first_seen_cfi?: string | null;
  first_seen_book_hash?: string | null;
  is_ghost: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DBWikiBlock {
  user_id: string;
  id: string;
  page_id: string;
  book_hash: string;
  cfi: string;
  xpointer0?: string | null;
  xpointer1?: string | null;
  quote_text?: string | null;
  note_markdown?: string | null;
  tags_json: unknown;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DBWikiTag {
  user_id: string;
  id: string;
  namespace_id: string;
  tag_name: string;
  built_in_type?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DBWikiLink {
  user_id: string;
  source_page_id: string;
  target_page_id: string;
  source_block_id: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DBWikiSectionCatalog {
  user_id: string;
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}
