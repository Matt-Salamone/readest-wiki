import type { Book } from '@/types/book';
import type {
  WikiBlock,
  WikiLink,
  WikiNamespace,
  WikiNamespaceKind,
  WikiPage,
  WikiPageType,
  WikiSectionCatalogEntry,
  WikiTag,
} from '@/types/wiki';
import type { AppService } from '@/types/system';
import { md5Fingerprint } from '@/utils/md5';

const DB_SCHEMA = 'wiki';
const DB_PATH = 'wiki.db';

const WIKI_LINK_REGEX = /\[\[([^\]\r\n]+?)\]\]/g;

/** Escape regex metacharacters for use in RegExp constructor. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Stable slug for wiki page titles (namespace-unique resolution + [[link]] matching).
 */
export function wikiTitleToSlug(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.length > 0 ? s : 'page';
}

/**
 * Extract unique link targets from markdown, in first-seen order.
 */
export function parseWikiLinks(markdown: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK_REGEX.source, WIKI_LINK_REGEX.flags);
  while ((m = re.exec(markdown)) !== null) {
    const raw = m[1]?.trim() ?? '';
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

type WikiNamespaceRow = {
  id: string;
  kind: string;
  title: string;
  imported_mode: number;
  book_hashes_json: string;
  created_at: number;
  updated_at: number;
};

type WikiPageRow = {
  id: string;
  namespace_id: string;
  title: string;
  title_slug: string;
  page_type: string | null;
  summary_markdown: string;
  first_seen_cfi: string | null;
  first_seen_book_hash: string | null;
  is_ghost: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

type WikiBlockRow = {
  id: string;
  page_id: string;
  book_hash: string;
  cfi: string;
  xpointer0: string | null;
  xpointer1: string | null;
  quote_text: string | null;
  note_markdown: string | null;
  tags_json: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

type WikiTagRow = {
  id: string;
  namespace_id: string;
  tag_name: string;
  built_in_type: string | null;
};

type WikiLinkRow = {
  source_page_id: string;
  target_page_id: string;
  source_block_id: string;
};

type WikiSectionCatalogRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: number;
};

function rowToNamespace(row: WikiNamespaceRow): WikiNamespace {
  let bookHashes: string[] = [];
  try {
    const parsed = JSON.parse(row.book_hashes_json) as unknown;
    if (Array.isArray(parsed)) {
      bookHashes = parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    bookHashes = [];
  }
  return {
    id: row.id,
    kind: row.kind as WikiNamespaceKind,
    title: row.title,
    importedMode: (row.imported_mode ? 1 : 0) as 0 | 1,
    bookHashes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPage(row: WikiPageRow): WikiPage {
  return {
    id: row.id,
    namespaceId: row.namespace_id,
    title: row.title,
    titleSlug: row.title_slug,
    pageType: (row.page_type as WikiPageType | null) ?? null,
    summaryMarkdown: row.summary_markdown,
    firstSeenCfi: row.first_seen_cfi,
    firstSeenBookHash: row.first_seen_book_hash,
    isGhost: (row.is_ghost ? 1 : 0) as 0 | 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function rowToBlock(row: WikiBlockRow): WikiBlock {
  let tagIds: string[] = [];
  try {
    const parsed = JSON.parse(row.tags_json) as unknown;
    if (Array.isArray(parsed)) {
      tagIds = parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    tagIds = [];
  }
  return {
    id: row.id,
    pageId: row.page_id,
    bookHash: row.book_hash,
    cfi: row.cfi,
    xpointer0: row.xpointer0,
    xpointer1: row.xpointer1,
    quoteText: row.quote_text,
    noteMarkdown: row.note_markdown,
    tagIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function rowToTag(row: WikiTagRow): WikiTag {
  return {
    id: row.id,
    namespaceId: row.namespace_id,
    tagName: row.tag_name,
    builtInType: (row.built_in_type as WikiPageType | null) ?? null,
  };
}

function rowToLink(row: WikiLinkRow): WikiLink {
  return {
    sourcePageId: row.source_page_id,
    targetPageId: row.target_page_id,
    sourceBlockId: row.source_block_id === '' ? null : row.source_block_id,
  };
}

function rowToSectionCatalog(row: WikiSectionCatalogRow): WikiSectionCatalogEntry {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function linkKeyBlockId(sourceBlockId: string | null): string {
  return sourceBlockId ?? '';
}

function parseBookHashesJson(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    // ignore
  }
  return [];
}

export class WikiStore {
  private appService: AppService;

  constructor(appService: AppService) {
    this.appService = appService;
  }

  private async withDb<T>(fn: (db: Awaited<ReturnType<AppService['openDatabase']>>) => Promise<T>) {
    const db = await this.appService.openDatabase(DB_SCHEMA, DB_PATH, 'Data');
    try {
      return await fn(db);
    } finally {
      await db.close();
    }
  }

  async resolveNamespaceForBook(book: Book): Promise<WikiNamespace> {
    const groupName = book.groupName?.trim();
    const groupId = book.groupId?.trim();
    let id: string;
    let kind: WikiNamespaceKind;
    let title: string;

    if (groupName && groupId) {
      id = `group:${groupId}`;
      kind = 'group';
      title = groupName;
    } else {
      id = `book:${book.metaHash ?? book.hash}`;
      kind = 'standalone';
      title = book.title;
    }

    const now = Date.now();

    return this.withDb(async (db) => {
      const existing = await db.select<WikiNamespaceRow>(
        `SELECT id, kind, title, imported_mode, book_hashes_json, created_at, updated_at
         FROM wiki_namespaces WHERE id = ?`,
        [id],
      );

      if (existing.length === 0) {
        const bookHashes = [book.hash];
        await db.execute(
          `INSERT INTO wiki_namespaces (id, kind, title, imported_mode, book_hashes_json, created_at, updated_at)
           VALUES (?, ?, ?, 0, ?, ?, ?)`,
          [id, kind, title, JSON.stringify(bookHashes), now, now],
        );
        const rows = await db.select<WikiNamespaceRow>(
          `SELECT id, kind, title, imported_mode, book_hashes_json, created_at, updated_at
           FROM wiki_namespaces WHERE id = ?`,
          [id],
        );
        return rowToNamespace(rows[0]!);
      }

      const row = existing[0]!;
      let bookHashes: string[] = [];
      try {
        const parsed = JSON.parse(row.book_hashes_json) as unknown;
        if (Array.isArray(parsed)) {
          bookHashes = parsed.filter((x): x is string => typeof x === 'string');
        }
      } catch {
        bookHashes = [];
      }
      if (!bookHashes.includes(book.hash)) {
        bookHashes = [...bookHashes, book.hash];
        await db.execute(
          `UPDATE wiki_namespaces SET book_hashes_json = ?, updated_at = ? WHERE id = ?`,
          [JSON.stringify(bookHashes), now, id],
        );
      }

      const rows = await db.select<WikiNamespaceRow>(
        `SELECT id, kind, title, imported_mode, book_hashes_json, created_at, updated_at
         FROM wiki_namespaces WHERE id = ?`,
        [id],
      );
      return rowToNamespace(rows[0]!);
    });
  }

  /**
   * When the user renames a library group, move the wiki namespace id/title so the same wiki stays attached.
   * Uses the same id scheme as the library: `group:` + md5Fingerprint(full group path).
   */
  async renameGroupNamespace(oldGroupName: string, newGroupName: string): Promise<void> {
    const oldTrim = oldGroupName.trim();
    const newTrim = newGroupName.trim();
    if (!oldTrim || !newTrim || oldTrim === newTrim) {
      return;
    }

    const oldId = `group:${md5Fingerprint(oldTrim)}`;
    const newId = `group:${md5Fingerprint(newTrim)}`;
    if (oldId === newId) {
      return;
    }

    const now = Date.now();

    return this.withDb(async (db) => {
      const oldRows = await db.select<WikiNamespaceRow>(
        `SELECT id, kind, title, imported_mode, book_hashes_json, created_at, updated_at
         FROM wiki_namespaces WHERE id = ?`,
        [oldId],
      );
      if (oldRows.length === 0) {
        return;
      }

      const newRows = await db.select<WikiNamespaceRow>(
        `SELECT id, kind, title, imported_mode, book_hashes_json, created_at, updated_at
         FROM wiki_namespaces WHERE id = ?`,
        [newId],
      );

      if (newRows.length > 0) {
        const oldHashes = parseBookHashesJson(oldRows[0]!.book_hashes_json);
        const newHashes = parseBookHashesJson(newRows[0]!.book_hashes_json);
        const merged = [...new Set([...newHashes, ...oldHashes])];

        await db.execute(`UPDATE wiki_pages SET namespace_id = ? WHERE namespace_id = ?`, [
          newId,
          oldId,
        ]);
        await db.execute(`UPDATE wiki_tags SET namespace_id = ? WHERE namespace_id = ?`, [
          newId,
          oldId,
        ]);
        await db.execute(
          `UPDATE wiki_namespaces SET book_hashes_json = ?, updated_at = ? WHERE id = ?`,
          [JSON.stringify(merged), now, newId],
        );
        await db.execute(`DELETE FROM wiki_namespaces WHERE id = ?`, [oldId]);
        return;
      }

      await db.execute(`UPDATE wiki_pages SET namespace_id = ? WHERE namespace_id = ?`, [
        newId,
        oldId,
      ]);
      await db.execute(`UPDATE wiki_tags SET namespace_id = ? WHERE namespace_id = ?`, [
        newId,
        oldId,
      ]);
      await db.execute(
        `UPDATE wiki_namespaces SET id = ?, title = ?, kind = ?, updated_at = ? WHERE id = ?`,
        [newId, newTrim, 'group', now, oldId],
      );
    });
  }

  async getNamespace(namespaceId: string): Promise<WikiNamespace | null> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiNamespaceRow>(
        `SELECT id, kind, title, imported_mode, book_hashes_json, created_at, updated_at
         FROM wiki_namespaces WHERE id = ?`,
        [namespaceId],
      );
      return rows[0] ? rowToNamespace(rows[0]) : null;
    });
  }

  async listAllNamespaces(): Promise<WikiNamespace[]> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiNamespaceRow>(
        `SELECT id, kind, title, imported_mode, book_hashes_json, created_at, updated_at
         FROM wiki_namespaces ORDER BY title COLLATE NOCASE ASC`,
      );
      return rows.map(rowToNamespace);
    });
  }

  async listAllPages(): Promise<WikiPage[]> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiPageRow>(
        `SELECT * FROM wiki_pages WHERE deleted_at IS NULL ORDER BY namespace_id ASC, title COLLATE NOCASE ASC`,
      );
      return rows.map(rowToPage);
    });
  }

  /**
   * Inbound [[links]] to a page: source page/block rows (skips deleted sources).
   */
  async listBacklinks(
    targetPageId: string,
  ): Promise<Array<{ link: WikiLink; sourcePage: WikiPage; sourceBlock: WikiBlock | null }>> {
    return this.withDb(async (db) => {
      const rows = await db.select<{
        source_page_id: string;
        target_page_id: string;
        source_block_id: string;
        sp_id: string;
        sp_namespace_id: string;
        sp_title: string;
        sp_title_slug: string;
        sp_page_type: string | null;
        sp_summary_markdown: string;
        sp_first_seen_cfi: string | null;
        sp_first_seen_book_hash: string | null;
        sp_is_ghost: number;
        sp_created_at: number;
        sp_updated_at: number;
        sp_deleted_at: number | null;
        sb_id: string | null;
        sb_page_id: string | null;
        sb_book_hash: string | null;
        sb_cfi: string | null;
        sb_xpointer0: string | null;
        sb_xpointer1: string | null;
        sb_quote_text: string | null;
        sb_note_markdown: string | null;
        sb_tags_json: string | null;
        sb_created_at: number | null;
        sb_updated_at: number | null;
        sb_deleted_at: number | null;
      }>(
        `SELECT
          l.source_page_id, l.target_page_id, l.source_block_id,
          sp.id AS sp_id, sp.namespace_id AS sp_namespace_id, sp.title AS sp_title,
          sp.title_slug AS sp_title_slug, sp.page_type AS sp_page_type,
          sp.summary_markdown AS sp_summary_markdown,
          sp.first_seen_cfi AS sp_first_seen_cfi,
          sp.first_seen_book_hash AS sp_first_seen_book_hash,
          sp.is_ghost AS sp_is_ghost, sp.created_at AS sp_created_at,
          sp.updated_at AS sp_updated_at, sp.deleted_at AS sp_deleted_at,
          sb.id AS sb_id, sb.page_id AS sb_page_id, sb.book_hash AS sb_book_hash,
          sb.cfi AS sb_cfi, sb.xpointer0 AS sb_xpointer0, sb.xpointer1 AS sb_xpointer1,
          sb.quote_text AS sb_quote_text, sb.note_markdown AS sb_note_markdown,
          sb.tags_json AS sb_tags_json, sb.created_at AS sb_created_at,
          sb.updated_at AS sb_updated_at, sb.deleted_at AS sb_deleted_at
        FROM wiki_links l
        INNER JOIN wiki_pages sp ON sp.id = l.source_page_id AND sp.deleted_at IS NULL
        LEFT JOIN wiki_blocks sb
          ON sb.id = l.source_block_id
          AND l.source_block_id != ''
          AND sb.deleted_at IS NULL
        WHERE l.target_page_id = ?
          AND (l.source_block_id = '' OR sb.id IS NOT NULL)`,
        [targetPageId],
      );

      const out: Array<{ link: WikiLink; sourcePage: WikiPage; sourceBlock: WikiBlock | null }> =
        [];
      for (const r of rows) {
        const link: WikiLink = {
          sourcePageId: r.source_page_id,
          targetPageId: r.target_page_id,
          sourceBlockId: r.source_block_id === '' ? null : r.source_block_id,
        };
        const sourcePage: WikiPage = rowToPage({
          id: r.sp_id,
          namespace_id: r.sp_namespace_id,
          title: r.sp_title,
          title_slug: r.sp_title_slug,
          page_type: r.sp_page_type,
          summary_markdown: r.sp_summary_markdown,
          first_seen_cfi: r.sp_first_seen_cfi,
          first_seen_book_hash: r.sp_first_seen_book_hash,
          is_ghost: r.sp_is_ghost,
          created_at: r.sp_created_at,
          updated_at: r.sp_updated_at,
          deleted_at: r.sp_deleted_at,
        });
        let sourceBlock: WikiBlock | null = null;
        if (r.source_block_id !== '' && r.sb_id && r.sb_tags_json != null) {
          sourceBlock = rowToBlock({
            id: r.sb_id,
            page_id: r.sb_page_id!,
            book_hash: r.sb_book_hash!,
            cfi: r.sb_cfi ?? '',
            xpointer0: r.sb_xpointer0,
            xpointer1: r.sb_xpointer1,
            quote_text: r.sb_quote_text,
            note_markdown: r.sb_note_markdown,
            tags_json: r.sb_tags_json,
            created_at: r.sb_created_at!,
            updated_at: r.sb_updated_at!,
            deleted_at: r.sb_deleted_at,
          });
        }
        out.push({ link, sourcePage, sourceBlock });
      }
      return out;
    });
  }

  /** Total blocks per namespace (for wiki index sidebar). */
  async countBlocksByNamespace(): Promise<Record<string, number>> {
    return this.withDb(async (db) => {
      const rows = await db.select<{ namespace_id: string; c: number }>(
        `SELECT p.namespace_id AS namespace_id, COUNT(*) AS c
         FROM wiki_blocks b
         INNER JOIN wiki_pages p ON p.id = b.page_id AND p.deleted_at IS NULL
         WHERE b.deleted_at IS NULL
         GROUP BY p.namespace_id`,
      );
      const acc: Record<string, number> = {};
      for (const r of rows) {
        acc[r.namespace_id] = r.c;
      }
      return acc;
    });
  }

  /** Block counts per page id within a namespace (for index UI). */
  async countBlocksByPage(namespaceId: string): Promise<Record<string, number>> {
    return this.withDb(async (db) => {
      const rows = await db.select<{ page_id: string; cnt: number }>(
        `SELECT b.page_id AS page_id, COUNT(*) AS cnt
         FROM wiki_blocks b
         INNER JOIN wiki_pages p ON p.id = b.page_id AND p.namespace_id = ? AND p.deleted_at IS NULL
         WHERE b.deleted_at IS NULL
         GROUP BY b.page_id`,
        [namespaceId],
      );
      const acc: Record<string, number> = {};
      for (const r of rows) {
        acc[r.page_id] = r.cnt;
      }
      return acc;
    });
  }

  async createPage(input: {
    namespaceId: string;
    title: string;
    pageType?: WikiPageType | null;
    summaryMarkdown?: string;
    firstSeenCfi?: string | null;
    firstSeenBookHash?: string | null;
    isGhost?: 0 | 1;
  }): Promise<WikiPage> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const titleSlug = wikiTitleToSlug(input.title);
    const summaryMarkdown = input.summaryMarkdown ?? '';
    const isGhost = input.isGhost ?? 0;

    return this.withDb(async (db) => {
      await db.execute(
        `INSERT INTO wiki_pages (
          id, namespace_id, title, title_slug, page_type, summary_markdown,
          first_seen_cfi, first_seen_book_hash, is_ghost, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          id,
          input.namespaceId,
          input.title.trim(),
          titleSlug,
          input.pageType ?? null,
          summaryMarkdown,
          input.firstSeenCfi ?? null,
          input.firstSeenBookHash ?? null,
          isGhost,
          now,
          now,
        ],
      );
      const rows = await db.select<WikiPageRow>(`SELECT * FROM wiki_pages WHERE id = ?`, [id]);
      return rowToPage(rows[0]!);
    });
  }

  async updatePage(
    pageId: string,
    patch: Partial<
      Pick<
        WikiPage,
        'title' | 'pageType' | 'summaryMarkdown' | 'firstSeenCfi' | 'firstSeenBookHash' | 'isGhost'
      >
    >,
  ): Promise<WikiPage | null> {
    return this.withDb(async (db) => {
      const cur = await db.select<WikiPageRow>(`SELECT * FROM wiki_pages WHERE id = ?`, [pageId]);
      if (!cur[0] || cur[0].deleted_at != null) return null;
      const row = cur[0];
      const now = Date.now();
      let title = row.title;
      let titleSlug = row.title_slug;
      if (patch.title !== undefined) {
        title = patch.title.trim();
        titleSlug = wikiTitleToSlug(title);
      }
      const pageType = patch.pageType !== undefined ? patch.pageType : row.page_type;
      const summaryMarkdown =
        patch.summaryMarkdown !== undefined ? patch.summaryMarkdown : row.summary_markdown;
      const firstSeenCfi =
        patch.firstSeenCfi !== undefined ? patch.firstSeenCfi : row.first_seen_cfi;
      const firstSeenBookHash =
        patch.firstSeenBookHash !== undefined ? patch.firstSeenBookHash : row.first_seen_book_hash;
      const isGhost = patch.isGhost !== undefined ? patch.isGhost : row.is_ghost ? 1 : 0;

      await db.execute(
        `UPDATE wiki_pages SET
          title = ?, title_slug = ?, page_type = ?, summary_markdown = ?,
          first_seen_cfi = ?, first_seen_book_hash = ?, is_ghost = ?, updated_at = ?
         WHERE id = ?`,
        [
          title,
          titleSlug,
          pageType,
          summaryMarkdown,
          firstSeenCfi,
          firstSeenBookHash,
          isGhost,
          now,
          pageId,
        ],
      );
      const rows = await db.select<WikiPageRow>(`SELECT * FROM wiki_pages WHERE id = ?`, [pageId]);
      return rowToPage(rows[0]!);
    });
  }

  async softDeletePage(pageId: string): Promise<boolean> {
    const now = Date.now();
    return this.withDb(async (db) => {
      const r = await db.execute(
        `UPDATE wiki_pages SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
        [now, now, pageId],
      );
      return r.rowsAffected > 0;
    });
  }

  async getPage(pageId: string): Promise<WikiPage | null> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiPageRow>(
        `SELECT * FROM wiki_pages WHERE id = ? AND deleted_at IS NULL`,
        [pageId],
      );
      return rows[0] ? rowToPage(rows[0]) : null;
    });
  }

  async getPageByTitleSlug(namespaceId: string, titleSlug: string): Promise<WikiPage | null> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiPageRow>(
        `SELECT * FROM wiki_pages WHERE namespace_id = ? AND title_slug = ? AND deleted_at IS NULL`,
        [namespaceId, titleSlug],
      );
      return rows[0] ? rowToPage(rows[0]) : null;
    });
  }

  async listPages(namespaceId: string): Promise<WikiPage[]> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiPageRow>(
        `SELECT * FROM wiki_pages WHERE namespace_id = ? AND deleted_at IS NULL ORDER BY title COLLATE NOCASE`,
        [namespaceId],
      );
      return rows.map(rowToPage);
    });
  }

  async createBlock(input: {
    pageId: string;
    bookHash: string;
    cfi: string;
    xpointer0?: string | null;
    xpointer1?: string | null;
    quoteText?: string | null;
    noteMarkdown?: string | null;
    tagIds?: string[];
  }): Promise<WikiBlock> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const tagsJson = JSON.stringify(input.tagIds ?? []);

    return this.withDb(async (db) => {
      await db.execute(
        `INSERT INTO wiki_blocks (
          id, page_id, book_hash, cfi, xpointer0, xpointer1, quote_text, note_markdown,
          tags_json, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          id,
          input.pageId,
          input.bookHash,
          input.cfi,
          input.xpointer0 ?? null,
          input.xpointer1 ?? null,
          input.quoteText ?? null,
          input.noteMarkdown ?? null,
          tagsJson,
          now,
          now,
        ],
      );
      const rows = await db.select<WikiBlockRow>(`SELECT * FROM wiki_blocks WHERE id = ?`, [id]);
      return rowToBlock(rows[0]!);
    });
  }

  async updateBlock(
    blockId: string,
    patch: Partial<
      Pick<WikiBlock, 'cfi' | 'xpointer0' | 'xpointer1' | 'quoteText' | 'noteMarkdown' | 'tagIds'>
    >,
  ): Promise<WikiBlock | null> {
    return this.withDb(async (db) => {
      const cur = await db.select<WikiBlockRow>(`SELECT * FROM wiki_blocks WHERE id = ?`, [
        blockId,
      ]);
      if (!cur[0] || cur[0].deleted_at != null) return null;
      const row = cur[0];
      const now = Date.now();
      const cfi = patch.cfi ?? row.cfi;
      const xpointer0 = patch.xpointer0 !== undefined ? patch.xpointer0 : row.xpointer0;
      const xpointer1 = patch.xpointer1 !== undefined ? patch.xpointer1 : row.xpointer1;
      const quoteText = patch.quoteText !== undefined ? patch.quoteText : row.quote_text;
      const noteMarkdown =
        patch.noteMarkdown !== undefined ? patch.noteMarkdown : row.note_markdown;
      const tagsJson = patch.tagIds !== undefined ? JSON.stringify(patch.tagIds) : row.tags_json;

      await db.execute(
        `UPDATE wiki_blocks SET
          cfi = ?, xpointer0 = ?, xpointer1 = ?, quote_text = ?, note_markdown = ?,
          tags_json = ?, updated_at = ?
         WHERE id = ?`,
        [cfi, xpointer0, xpointer1, quoteText, noteMarkdown, tagsJson, now, blockId],
      );
      const rows = await db.select<WikiBlockRow>(`SELECT * FROM wiki_blocks WHERE id = ?`, [
        blockId,
      ]);
      return rowToBlock(rows[0]!);
    });
  }

  async softDeleteBlock(blockId: string): Promise<boolean> {
    const now = Date.now();
    return this.withDb(async (db) => {
      const r = await db.execute(
        `UPDATE wiki_blocks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
        [now, now, blockId],
      );
      return r.rowsAffected > 0;
    });
  }

  async listBlocksForPage(pageId: string): Promise<WikiBlock[]> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiBlockRow>(
        `SELECT * FROM wiki_blocks WHERE page_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
        [pageId],
      );
      return rows.map(rowToBlock);
    });
  }

  async listBlocksForBook(bookHash: string): Promise<WikiBlock[]> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiBlockRow>(
        `SELECT * FROM wiki_blocks WHERE book_hash = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
        [bookHash],
      );
      return rows.map(rowToBlock);
    });
  }

  async createTag(input: {
    namespaceId: string;
    tagName: string;
    builtInType?: WikiPageType | null;
  }): Promise<WikiTag> {
    const id = crypto.randomUUID();

    return this.withDb(async (db) => {
      await db.execute(
        `INSERT INTO wiki_tags (id, namespace_id, tag_name, built_in_type)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(namespace_id, tag_name) DO UPDATE SET built_in_type = COALESCE(excluded.built_in_type, wiki_tags.built_in_type)`,
        [id, input.namespaceId, input.tagName.trim(), input.builtInType ?? null],
      );
      const rows = await db.select<WikiTagRow>(
        `SELECT * FROM wiki_tags WHERE namespace_id = ? AND tag_name = ?`,
        [input.namespaceId, input.tagName.trim()],
      );
      return rowToTag(rows[0]!);
    });
  }

  async listTags(namespaceId: string): Promise<WikiTag[]> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiTagRow>(
        `SELECT * FROM wiki_tags WHERE namespace_id = ? ORDER BY tag_name COLLATE NOCASE`,
        [namespaceId],
      );
      return rows.map(rowToTag);
    });
  }

  /**
   * Global section labels for block grouping — one catalog shared by every wiki namespace.
   */
  async listSectionCatalog(): Promise<WikiSectionCatalogEntry[]> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiSectionCatalogRow>(
        `SELECT id, name, sort_order, created_at FROM wiki_section_catalog
         ORDER BY sort_order ASC, name COLLATE NOCASE ASC`,
      );
      return rows.map(rowToSectionCatalog);
    });
  }

  /**
   * Ensures a section name exists in the global catalog (case-insensitive duplicate → stored casing).
   * Call before {@link createTag} when saving a block section.
   */
  async ensureSectionInCatalog(rawName: string): Promise<string | null> {
    const trimmed = rawName.trim();
    if (!trimmed) return null;

    return this.withDb(async (db) => {
      const existing = await db.select<{ name: string }>(
        `SELECT name FROM wiki_section_catalog WHERE lower(name) = lower(?)`,
        [trimmed],
      );
      if (existing[0]) {
        return existing[0].name;
      }

      const maxRows = await db.select<{ m: number | null }>(
        `SELECT MAX(sort_order) AS m FROM wiki_section_catalog`,
      );
      const nextOrder = (maxRows[0]?.m ?? -1) + 1;
      const now = Date.now();
      const id = crypto.randomUUID();
      await db.execute(
        `INSERT INTO wiki_section_catalog (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)`,
        [id, trimmed, nextOrder, now],
      );
      return trimmed;
    });
  }

  /**
   * Replace materialized outbound links for one markdown field (page summary or block note).
   */
  async upsertWikiLinks(
    sourcePageId: string,
    sourceBlockId: string | null,
    markdown: string,
    namespaceId: string,
  ): Promise<void> {
    return this.withDb(async (db) => {
      await this.upsertWikiLinksInDb(db, sourcePageId, sourceBlockId, markdown, namespaceId);
    });
  }

  async listLinksToTarget(targetPageId: string): Promise<WikiLink[]> {
    return this.withDb(async (db) => {
      const rows = await db.select<WikiLinkRow>(
        `SELECT source_page_id, target_page_id, source_block_id FROM wiki_links WHERE target_page_id = ?`,
        [targetPageId],
      );
      return rows.map(rowToLink);
    });
  }

  async renamePage(pageId: string, newTitle: string): Promise<WikiPage | null> {
    const trimmed = newTitle.trim();
    if (!trimmed) return null;

    return this.withDb(async (db) => {
      const pageRows = await db.select<WikiPageRow>(`SELECT * FROM wiki_pages WHERE id = ?`, [
        pageId,
      ]);
      if (!pageRows[0] || pageRows[0].deleted_at != null) return null;
      const page = pageRows[0];
      const oldTitle = page.title;
      const namespaceId = page.namespace_id;
      const newSlug = wikiTitleToSlug(trimmed);

      const conflict = await db.select<WikiPageRow>(
        `SELECT id FROM wiki_pages WHERE namespace_id = ? AND title_slug = ? AND deleted_at IS NULL AND id != ?`,
        [namespaceId, newSlug, pageId],
      );
      if (conflict.length > 0) {
        return null;
      }

      const linkRows = await db.select<WikiLinkRow>(
        `SELECT DISTINCT source_page_id, source_block_id FROM wiki_links WHERE target_page_id = ?`,
        [pageId],
      );

      const replaceInMarkdown = (md: string): string => {
        if (!md) return md;
        const re = new RegExp(`\\[\\[${escapeRegExp(oldTitle)}\\]\\]`, 'g');
        return md.replace(re, `[[${trimmed}]]`);
      };

      for (const lr of linkRows) {
        if (lr.source_block_id === '') {
          const src = await db.select<WikiPageRow>(
            `SELECT * FROM wiki_pages WHERE id = ? AND deleted_at IS NULL`,
            [lr.source_page_id],
          );
          if (src[0]) {
            const next = replaceInMarkdown(src[0].summary_markdown);
            await db.execute(
              `UPDATE wiki_pages SET summary_markdown = ?, updated_at = ? WHERE id = ?`,
              [next, Date.now(), lr.source_page_id],
            );
          }
        } else {
          const blk = await db.select<WikiBlockRow>(
            `SELECT * FROM wiki_blocks WHERE id = ? AND deleted_at IS NULL`,
            [lr.source_block_id],
          );
          if (blk[0]) {
            const next = replaceInMarkdown(blk[0].note_markdown ?? '');
            await db.execute(
              `UPDATE wiki_blocks SET note_markdown = ?, updated_at = ? WHERE id = ?`,
              [next, Date.now(), lr.source_block_id],
            );
          }
        }
      }

      const now = Date.now();
      await db.execute(
        `UPDATE wiki_pages SET title = ?, title_slug = ?, updated_at = ? WHERE id = ?`,
        [trimmed, newSlug, now, pageId],
      );

      const updated = await db.select<WikiPageRow>(`SELECT * FROM wiki_pages WHERE id = ?`, [
        pageId,
      ]);
      const result = rowToPage(updated[0]!);

      for (const lr of linkRows) {
        let md = '';
        if (lr.source_block_id === '') {
          const src = await db.select<WikiPageRow>(
            `SELECT summary_markdown FROM wiki_pages WHERE id = ?`,
            [lr.source_page_id],
          );
          md = src[0]?.summary_markdown ?? '';
        } else {
          const blk = await db.select<WikiBlockRow>(
            `SELECT note_markdown FROM wiki_blocks WHERE id = ?`,
            [lr.source_block_id],
          );
          md = blk[0]?.note_markdown ?? '';
        }
        await this.upsertWikiLinksInDb(
          db,
          lr.source_page_id,
          lr.source_block_id === '' ? null : lr.source_block_id,
          md,
          namespaceId,
        );
      }

      return result;
    });
  }

  /** In-db variant for rename cascade (same connection). */
  private async upsertWikiLinksInDb(
    db: Awaited<ReturnType<AppService['openDatabase']>>,
    sourcePageId: string,
    sourceBlockId: string | null,
    markdown: string,
    namespaceId: string,
  ): Promise<void> {
    const blockKey = linkKeyBlockId(sourceBlockId);
    const titles = parseWikiLinks(markdown);

    await db.execute(`DELETE FROM wiki_links WHERE source_page_id = ? AND source_block_id = ?`, [
      sourcePageId,
      blockKey,
    ]);

    for (const linkTitle of titles) {
      const slug = wikiTitleToSlug(linkTitle);
      const rows = await db.select<WikiPageRow>(
        `SELECT * FROM wiki_pages WHERE namespace_id = ? AND title_slug = ? AND deleted_at IS NULL`,
        [namespaceId, slug],
      );

      let targetId: string;
      if (rows.length === 0) {
        const ghostId = crypto.randomUUID();
        const now = Date.now();
        await db.execute(
          `INSERT INTO wiki_pages (
            id, namespace_id, title, title_slug, page_type, summary_markdown,
            first_seen_cfi, first_seen_book_hash, is_ghost, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, NULL, '', NULL, NULL, 1, ?, ?, NULL)`,
          [ghostId, namespaceId, linkTitle.trim(), slug, now, now],
        );
        targetId = ghostId;
      } else {
        targetId = rows[0]!.id;
      }

      await db.execute(
        `INSERT INTO wiki_links (source_page_id, target_page_id, source_block_id)
         VALUES (?, ?, ?)
         ON CONFLICT(source_page_id, target_page_id, source_block_id) DO NOTHING`,
        [sourcePageId, targetId, blockKey],
      );
    }
  }
}
