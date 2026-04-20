import { MigrationEntry, SchemaType } from '../migrate';

/**
 * Migration definitions for each schema type.
 *
 * To add a new migration:
 *   1. Append a new entry to the appropriate schema array below.
 *   2. Use a date-based name: YYYYMMDDNN (NN = sequence within the day).
 *   3. Never reorder or remove existing entries.
 *
 * To add a new schema type:
 *   1. Add the type to SchemaType in migrate.ts.
 *   2. Add a new key here with its migration array.
 */
const migrations: Record<SchemaType, MigrationEntry[]> = {
  wiki: [
    {
      name: '2026041901_wiki_initial_schema',
      sql: `
        CREATE TABLE IF NOT EXISTS wiki_namespaces (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          imported_mode INTEGER NOT NULL DEFAULT 0,
          book_hashes_json TEXT NOT NULL DEFAULT '[]',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS wiki_pages (
          id TEXT PRIMARY KEY,
          namespace_id TEXT NOT NULL,
          title TEXT NOT NULL,
          title_slug TEXT NOT NULL,
          page_type TEXT,
          summary_markdown TEXT NOT NULL DEFAULT '',
          first_seen_cfi TEXT,
          first_seen_book_hash TEXT,
          is_ghost INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          UNIQUE(namespace_id, title_slug)
        );

        CREATE TABLE IF NOT EXISTS wiki_blocks (
          id TEXT PRIMARY KEY,
          page_id TEXT NOT NULL,
          book_hash TEXT NOT NULL,
          cfi TEXT NOT NULL,
          xpointer0 TEXT,
          xpointer1 TEXT,
          quote_text TEXT,
          note_markdown TEXT,
          tags_json TEXT NOT NULL DEFAULT '[]',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS wiki_tags (
          id TEXT PRIMARY KEY,
          namespace_id TEXT NOT NULL,
          tag_name TEXT NOT NULL,
          built_in_type TEXT,
          UNIQUE(namespace_id, tag_name)
        );

        CREATE TABLE IF NOT EXISTS wiki_links (
          source_page_id TEXT NOT NULL,
          target_page_id TEXT NOT NULL,
          source_block_id TEXT NOT NULL DEFAULT '',
          PRIMARY KEY (source_page_id, target_page_id, source_block_id)
        );

        CREATE INDEX IF NOT EXISTS idx_wiki_pages_namespace_id ON wiki_pages (namespace_id);
        CREATE INDEX IF NOT EXISTS idx_wiki_pages_namespace_title_slug ON wiki_pages (namespace_id, title_slug);
        CREATE INDEX IF NOT EXISTS idx_wiki_blocks_page_id ON wiki_blocks (page_id);
        CREATE INDEX IF NOT EXISTS idx_wiki_blocks_book_hash ON wiki_blocks (book_hash);
        CREATE INDEX IF NOT EXISTS idx_wiki_links_target_page_id ON wiki_links (target_page_id);
      `,
    },
    {
      name: '2026042001_wiki_section_catalog',
      sql: `
        CREATE TABLE IF NOT EXISTS wiki_section_catalog (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_wiki_section_catalog_sort
        ON wiki_section_catalog (sort_order, name COLLATE NOCASE);

        INSERT OR IGNORE INTO wiki_section_catalog (id, name, sort_order, created_at) VALUES
          ('wiki-sec-appearance', 'Appearance', 0, 0),
          ('wiki-sec-lore', 'Lore', 1, 0),
          ('wiki-sec-history', 'History', 2, 0),
          ('wiki-sec-relationships', 'Relationships', 3, 0),
          ('wiki-sec-theory', 'Theory', 4, 0),
          ('wiki-sec-timeline', 'Timeline', 5, 0),
          ('wiki-sec-notes', 'Notes', 6, 0),
          ('wiki-sec-concepts', 'Concepts', 7, 0);
      `,
    },
  ],
  'hardcover-sync': [
    {
      name: '2026032901_hardcover_note_mappings',
      sql: `
        CREATE TABLE IF NOT EXISTS hardcover_note_mappings (
          book_hash TEXT NOT NULL,
          note_id TEXT NOT NULL,
          hardcover_journal_id INTEGER NOT NULL,
          payload_hash TEXT NOT NULL,
          synced_at INTEGER NOT NULL,
          PRIMARY KEY (book_hash, note_id)
        );

        CREATE INDEX IF NOT EXISTS idx_hardcover_note_mappings_synced_at
        ON hardcover_note_mappings (synced_at);
      `,
    },
  ],
};

export function getMigrations(schema: SchemaType): MigrationEntry[] {
  return migrations[schema] ?? [];
}
