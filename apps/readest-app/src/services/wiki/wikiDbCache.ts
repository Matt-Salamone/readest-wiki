import type { AppService } from '@/types/system';
import type { DatabaseService } from '@/types/database';

const WIKI_DB_CACHE_KEY = '__readestWikiDbConnection' as const;

type WikiDbCacheState = {
  db: DatabaseService | null;
  opening: Promise<DatabaseService> | null;
};

function cacheHost(): Record<string, WikiDbCacheState | undefined> {
  try {
    if (typeof window !== 'undefined' && window.top) {
      return window.top as unknown as Record<string, WikiDbCacheState | undefined>;
    }
  } catch {
    /* cross-origin */
  }
  return globalThis as unknown as Record<string, WikiDbCacheState | undefined>;
}

function getState(): WikiDbCacheState {
  const host = cacheHost();
  let s = host[WIKI_DB_CACHE_KEY];
  if (!s) {
    s = { db: null, opening: null };
    host[WIKI_DB_CACHE_KEY] = s;
  }
  return s;
}

/**
 * One long-lived wiki.db handle for Tauri/Web (avoids Rust plugin map churn from open/close per query).
 * State lives on `window.top` so duplicate bundles share the same connection.
 */
export async function getOrOpenWikiDatabase(appService: AppService): Promise<DatabaseService> {
  const s = getState();
  if (s.db) return s.db;
  if (s.opening) return s.opening;
  s.opening = (async () => {
    try {
      const db = await appService.openDatabase('wiki', 'wiki.db', 'Data');
      s.db = db;
      return db;
    } finally {
      s.opening = null;
    }
  })();
  return s.opening;
}

/** Close the cached wiki DB (e.g. backup restore). Caller should serialize via `runOnWikiDb`. */
export async function closeWikiDatabaseCache(): Promise<void> {
  const s = getState();
  const db = s.db;
  s.db = null;
  s.opening = null;
  if (db) {
    await db.close();
  }
}
