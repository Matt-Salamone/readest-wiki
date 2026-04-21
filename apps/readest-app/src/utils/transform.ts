import {
  Book,
  BookConfig,
  BookFormat,
  BookNote,
  BookNoteType,
  HighlightColor,
  HighlightStyle,
  ReadingStatus,
} from '@/types/book';
import {
  DBBookConfig,
  DBBook,
  DBBookNote,
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
  WikiPageType,
  WikiSectionCatalogEntry,
  WikiTag,
} from '@/types/wiki';
import { sanitizeString } from './sanitize';

export const transformBookConfigToDB = (bookConfig: unknown, userId: string): DBBookConfig => {
  const {
    bookHash,
    metaHash,
    progress,
    location,
    xpointer,
    rsvpPosition,
    searchConfig,
    viewSettings,
    updatedAt,
  } = bookConfig as BookConfig;

  return {
    user_id: userId,
    book_hash: bookHash!,
    meta_hash: metaHash,
    location: location,
    xpointer: xpointer,
    progress: progress && JSON.stringify(progress),
    rsvp_position: rsvpPosition && JSON.stringify(rsvpPosition),
    search_config: searchConfig && JSON.stringify(searchConfig),
    view_settings: viewSettings && JSON.stringify(viewSettings),
    updated_at: new Date(updatedAt ?? Date.now()).toISOString(),
  };
};

export const transformBookConfigFromDB = (dbBookConfig: DBBookConfig): BookConfig => {
  const {
    book_hash,
    meta_hash,
    progress,
    location,
    xpointer,
    rsvp_position,
    search_config,
    view_settings,
    updated_at,
  } = dbBookConfig;
  return {
    bookHash: book_hash,
    metaHash: meta_hash,
    location,
    xpointer,
    progress: progress && JSON.parse(progress),
    rsvpPosition: rsvp_position && JSON.parse(rsvp_position),
    searchConfig: search_config && JSON.parse(search_config),
    viewSettings: view_settings && JSON.parse(view_settings),
    updatedAt: new Date(updated_at!).getTime(),
  } as BookConfig;
};

export const transformBookToDB = (book: unknown, userId: string): DBBook => {
  const {
    hash,
    metaHash,
    format,
    title,
    sourceTitle,
    author,
    groupId,
    groupName,
    tags,
    progress,
    readingStatus,
    metadata,
    createdAt,
    updatedAt,
    deletedAt,
    uploadedAt,
  } = book as Book;

  return {
    user_id: userId,
    book_hash: hash,
    meta_hash: metaHash,
    format,
    title: sanitizeString(title)!,
    author: sanitizeString(author)!,
    group_id: groupId,
    group_name: sanitizeString(groupName),
    tags: tags,
    progress: progress,
    reading_status: readingStatus,
    source_title: sanitizeString(sourceTitle),
    metadata: metadata ? sanitizeString(JSON.stringify(metadata)) : null,
    created_at: new Date(createdAt ?? Date.now()).toISOString(),
    updated_at: new Date(updatedAt ?? Date.now()).toISOString(),
    deleted_at: deletedAt ? new Date(deletedAt).toISOString() : null,
    uploaded_at: uploadedAt ? new Date(uploadedAt).toISOString() : null,
  };
};

export const transformBookFromDB = (dbBook: DBBook): Book => {
  const {
    book_hash,
    meta_hash,
    format,
    title,
    author,
    group_id,
    group_name,
    tags,
    progress,
    reading_status,
    source_title,
    metadata,
    created_at,
    updated_at,
    deleted_at,
    uploaded_at,
  } = dbBook;

  return {
    hash: book_hash,
    metaHash: meta_hash,
    format: format as BookFormat,
    title,
    author,
    groupId: group_id,
    groupName: group_name,
    tags: tags,
    progress: progress,
    readingStatus: reading_status as ReadingStatus,
    sourceTitle: source_title,
    metadata: metadata ? JSON.parse(metadata) : null,
    createdAt: new Date(created_at!).getTime(),
    updatedAt: new Date(updated_at!).getTime(),
    deletedAt: deleted_at ? new Date(deleted_at).getTime() : null,
    uploadedAt: uploaded_at ? new Date(uploaded_at).getTime() : null,
  };
};

export const transformBookNoteToDB = (bookNote: unknown, userId: string): DBBookNote => {
  const {
    bookHash,
    metaHash,
    id,
    type,
    cfi,
    xpointer0,
    xpointer1,
    page,
    text,
    style,
    color,
    note,
    createdAt,
    updatedAt,
    deletedAt,
  } = bookNote as BookNote;

  return {
    user_id: userId,
    book_hash: bookHash!,
    meta_hash: metaHash,
    id,
    type,
    cfi,
    xpointer0,
    xpointer1,
    page,
    text: sanitizeString(text),
    style,
    color,
    note,
    created_at: new Date(createdAt ?? Date.now()).toISOString(),
    updated_at: new Date(updatedAt ?? Date.now()).toISOString(),
    // note that only null deleted_at is updated to the database, undefined is not
    deleted_at: deletedAt ? new Date(deletedAt).toISOString() : null,
  };
};

export const transformBookNoteFromDB = (dbBookNote: DBBookNote): BookNote => {
  const {
    book_hash,
    meta_hash,
    id,
    type,
    cfi,
    xpointer0,
    xpointer1,
    page,
    text,
    style,
    color,
    note,
    created_at,
    updated_at,
    deleted_at,
  } = dbBookNote;

  return {
    bookHash: book_hash,
    metaHash: meta_hash,
    id,
    type: type as BookNoteType,
    cfi: cfi ?? '',
    xpointer0,
    xpointer1,
    page,
    text,
    style: style as HighlightStyle,
    color: color as HighlightColor,
    note,
    createdAt: new Date(created_at!).getTime(),
    updatedAt: new Date(updated_at!).getTime(),
    deletedAt: deleted_at ? new Date(deleted_at).getTime() : null,
  };
};

const wikiIso = (ms: number | undefined | null): string => new Date(ms ?? Date.now()).toISOString();

const wikiMs = (iso: string | undefined | null): number => (iso ? new Date(iso).getTime() : 0);

const parseBookHashesJson = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const transformWikiNamespaceToDB = (wiki: unknown, userId: string): DBWikiNamespace => {
  const w = wiki as WikiNamespace;
  return {
    user_id: userId,
    id: w.id,
    kind: w.kind,
    title: w.title,
    imported_mode: w.importedMode ? 1 : 0,
    book_hashes_json: w.bookHashes,
    created_at: wikiIso(w.createdAt),
    updated_at: wikiIso(w.updatedAt),
    deleted_at: null,
  };
};

export const transformWikiNamespaceFromDB = (db: DBWikiNamespace): WikiNamespace => ({
  id: db.id,
  kind: db.kind as WikiNamespace['kind'],
  title: db.title,
  importedMode: (db.imported_mode ? 1 : 0) as 0 | 1,
  spoilerOverride: null,
  bookHashes: parseBookHashesJson(db.book_hashes_json),
  createdAt: wikiMs(db.created_at),
  updatedAt: wikiMs(db.updated_at),
});

export const transformWikiPageToDB = (page: unknown, userId: string): DBWikiPage => {
  const p = page as WikiPage;
  return {
    user_id: userId,
    id: p.id,
    namespace_id: p.namespaceId,
    title: p.title,
    title_slug: p.titleSlug,
    page_type: p.pageType,
    summary_markdown: p.summaryMarkdown,
    first_seen_cfi: p.firstSeenCfi,
    first_seen_book_hash: p.firstSeenBookHash,
    is_ghost: p.isGhost,
    created_at: wikiIso(p.createdAt),
    updated_at: wikiIso(p.updatedAt),
    deleted_at: p.deletedAt != null ? wikiIso(p.deletedAt) : null,
  };
};

export const transformWikiPageFromDB = (db: DBWikiPage): WikiPage => ({
  id: db.id,
  namespaceId: db.namespace_id,
  title: db.title,
  titleSlug: db.title_slug,
  pageType: (db.page_type as WikiPageType | null) ?? null,
  summaryMarkdown: db.summary_markdown,
  firstSeenCfi: db.first_seen_cfi ?? null,
  firstSeenBookHash: db.first_seen_book_hash ?? null,
  isGhost: (db.is_ghost ? 1 : 0) as 0 | 1,
  createdAt: wikiMs(db.created_at),
  updatedAt: wikiMs(db.updated_at),
  deletedAt: db.deleted_at ? wikiMs(db.deleted_at) : null,
});

export const transformWikiBlockToDB = (block: unknown, userId: string): DBWikiBlock => {
  const b = block as WikiBlock;
  return {
    user_id: userId,
    id: b.id,
    page_id: b.pageId,
    book_hash: b.bookHash,
    cfi: b.cfi,
    xpointer0: b.xpointer0,
    xpointer1: b.xpointer1,
    quote_text: b.quoteText,
    note_markdown: b.noteMarkdown,
    tags_json: b.tagIds,
    created_at: wikiIso(b.createdAt),
    updated_at: wikiIso(b.updatedAt),
    deleted_at: b.deletedAt != null ? wikiIso(b.deletedAt) : null,
  };
};

export const transformWikiBlockFromDB = (db: DBWikiBlock): WikiBlock => {
  let tagIds: string[] = [];
  if (Array.isArray(db.tags_json)) {
    tagIds = db.tags_json.filter((x): x is string => typeof x === 'string');
  } else if (typeof db.tags_json === 'string') {
    try {
      const p = JSON.parse(db.tags_json) as unknown;
      if (Array.isArray(p)) tagIds = p.filter((x): x is string => typeof x === 'string');
    } catch {
      tagIds = [];
    }
  }
  return {
    id: db.id,
    pageId: db.page_id,
    bookHash: db.book_hash,
    cfi: db.cfi,
    xpointer0: db.xpointer0 ?? null,
    xpointer1: db.xpointer1 ?? null,
    quoteText: db.quote_text ?? null,
    noteMarkdown: db.note_markdown ?? null,
    tagIds,
    createdAt: wikiMs(db.created_at),
    updatedAt: wikiMs(db.updated_at),
    deletedAt: db.deleted_at ? wikiMs(db.deleted_at) : null,
  };
};

export const transformWikiTagToDB = (tag: unknown, userId: string): DBWikiTag => {
  const t = tag as WikiTag;
  const u = t.updatedAt ?? Date.now();
  return {
    user_id: userId,
    id: t.id,
    namespace_id: t.namespaceId,
    tag_name: t.tagName,
    built_in_type: t.builtInType,
    created_at: wikiIso(u),
    updated_at: wikiIso(u),
    deleted_at: t.deletedAt != null ? wikiIso(t.deletedAt) : null,
  };
};

export const transformWikiTagFromDB = (db: DBWikiTag): WikiTag => ({
  id: db.id,
  namespaceId: db.namespace_id,
  tagName: db.tag_name,
  builtInType: (db.built_in_type as WikiPageType | null) ?? null,
  updatedAt: wikiMs(db.updated_at),
  deletedAt: db.deleted_at ? wikiMs(db.deleted_at) : null,
});

export const transformWikiLinkToDB = (link: unknown, userId: string): DBWikiLink => {
  const l = link as WikiLink;
  return {
    user_id: userId,
    source_page_id: l.sourcePageId,
    target_page_id: l.targetPageId,
    source_block_id: l.sourceBlockId ?? '',
    updated_at: wikiIso(l.updatedAt ?? Date.now()),
    deleted_at: l.deletedAt != null ? wikiIso(l.deletedAt) : null,
  };
};

export const transformWikiLinkFromDB = (db: DBWikiLink): WikiLink => ({
  sourcePageId: db.source_page_id,
  targetPageId: db.target_page_id,
  sourceBlockId: db.source_block_id === '' ? null : db.source_block_id,
  updatedAt: wikiMs(db.updated_at),
  deletedAt: db.deleted_at ? wikiMs(db.deleted_at) : null,
});

export const transformWikiSectionCatalogToDB = (
  entry: unknown,
  userId: string,
): DBWikiSectionCatalog => {
  const e = entry as WikiSectionCatalogEntry;
  return {
    user_id: userId,
    id: e.id,
    name: e.name,
    sort_order: e.sortOrder,
    created_at: wikiIso(e.createdAt),
    updated_at: wikiIso(e.updatedAt ?? Date.now()),
    deleted_at: e.deletedAt != null ? wikiIso(e.deletedAt) : null,
  };
};

export const transformWikiSectionCatalogFromDB = (
  db: DBWikiSectionCatalog,
): WikiSectionCatalogEntry => ({
  id: db.id,
  name: db.name,
  sortOrder: db.sort_order,
  createdAt: wikiMs(db.created_at),
  updatedAt: wikiMs(db.updated_at),
  deletedAt: db.deleted_at ? wikiMs(db.deleted_at) : null,
});
