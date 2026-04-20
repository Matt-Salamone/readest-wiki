import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { migrate } from '@/services/database/migrate';
import { getMigrations } from '@/services/database/migrations';
import { NodeDatabaseService } from '@/services/database/nodeDatabaseService';
import type { DatabaseService } from '@/types/database';

describe('wiki schema migration', () => {
  let db: DatabaseService;

  beforeEach(async () => {
    db = await NodeDatabaseService.open(':memory:');
  });

  afterEach(async () => {
    await db.close();
  });

  it('applies wiki migrations on a fresh database', async () => {
    await migrate(db, getMigrations('wiki'));

    const tables = await db.select<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'wiki%' ORDER BY name`,
    );
    expect(tables.map((r) => r.name)).toEqual([
      'wiki_blocks',
      'wiki_links',
      'wiki_namespaces',
      'wiki_pages',
      'wiki_tags',
    ]);

    const indexes = await db.select<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_wiki%' ORDER BY name`,
    );
    expect(indexes.map((r) => r.name)).toEqual([
      'idx_wiki_blocks_book_hash',
      'idx_wiki_blocks_page_id',
      'idx_wiki_links_target_page_id',
      'idx_wiki_pages_namespace_id',
      'idx_wiki_pages_namespace_title_slug',
    ]);

    const uv = await db.select<{ user_version: number }>('PRAGMA user_version');
    expect(uv[0]?.user_version).toBe(1);
  });

  it('is idempotent on second migrate()', async () => {
    await migrate(db, getMigrations('wiki'));
    await migrate(db, getMigrations('wiki'));

    const uv = await db.select<{ user_version: number }>('PRAGMA user_version');
    expect(uv[0]?.user_version).toBe(1);
  });
});
