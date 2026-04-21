import { Book, BookConfig, BookNote, BookDataRecord } from '@/types/book';
import type {
  DBWikiBlock,
  DBWikiLink,
  DBWikiNamespace,
  DBWikiPage,
  DBWikiSectionCatalog,
  DBWikiTag,
} from '@/types/records';
import type {
  WikiBlock,
  WikiLink,
  WikiNamespace,
  WikiPage,
  WikiSectionCatalogEntry,
  WikiTag,
} from '@/types/wiki';
import { getAPIBaseUrl } from '@/services/environment';
import { getAccessToken } from '@/utils/access';
import { fetchWithTimeout } from '@/utils/fetch';

const SYNC_API_ENDPOINT = getAPIBaseUrl() + '/sync';

export type SyncType = 'books' | 'configs' | 'notes' | 'wiki';
export type SyncOp = 'push' | 'pull' | 'both';

interface BookRecord extends BookDataRecord, Book {}
interface BookConfigRecord extends BookDataRecord, BookConfig {}
interface BookNoteRecord extends BookDataRecord, BookNote {}

/** Payload for POST /api/sync (camelCase domain rows; server transforms to DB). */
export interface WikiSyncPayload {
  namespaces?: Partial<WikiNamespace>[];
  pages?: Partial<WikiPage>[];
  blocks?: Partial<WikiBlock>[];
  tags?: Partial<WikiTag>[];
  links?: Partial<WikiLink>[];
  section_catalog?: Partial<WikiSectionCatalogEntry>[];
}

/** GET /api/sync returns snake_case DB rows from Supabase. */
export interface WikiSyncResult {
  namespaces: DBWikiNamespace[];
  pages: DBWikiPage[];
  blocks: DBWikiBlock[];
  tags: DBWikiTag[];
  links: DBWikiLink[];
  section_catalog: DBWikiSectionCatalog[];
}

export interface SyncResult {
  books: BookRecord[] | null;
  notes: BookNoteRecord[] | null;
  configs: BookConfigRecord[] | null;
  wiki?: WikiSyncResult | null;
}

export type SyncRecord = BookRecord & BookConfigRecord & BookNoteRecord;

export interface SyncData {
  books?: Partial<BookRecord>[];
  notes?: Partial<BookNoteRecord>[];
  configs?: Partial<BookConfigRecord>[];
  wiki?: WikiSyncPayload;
}

export class SyncClient {
  /**
   * Pull incremental changes since a given timestamp (in ms).
   * Returns updated or deleted records since that time.
   */
  async pullChanges(
    since: number,
    type?: SyncType,
    book?: string,
    metaHash?: string,
  ): Promise<SyncResult> {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const url = `${SYNC_API_ENDPOINT}?since=${encodeURIComponent(since)}&type=${type ?? ''}&book=${book ?? ''}&meta_hash=${metaHash ?? ''}`;
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      8000,
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to pull changes: ${error.error || res.statusText}`);
    }

    return res.json();
  }

  /**
   * Push local changes to the server.
   * Uses last-writer-wins logic as implemented on the server side.
   */
  async pushChanges(payload: SyncData): Promise<SyncResult> {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetchWithTimeout(
      SYNC_API_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
      8000,
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to push changes: ${error.error || res.statusText}`);
    }

    return res.json();
  }
}
