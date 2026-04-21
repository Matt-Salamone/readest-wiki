import type { Book } from '@/types/book';

export type WikiNamespaceKind = 'group' | 'standalone';

export type WikiPageType = 'Person' | 'Location' | 'Faction' | 'Item' | 'Concept' | 'Lore' | 'Misc';

/** `null` = auto (derive from readingStatus + importedMode); `'on'` = force spoiler gating; `'off'` = show all */
export type SpoilerOverride = 'on' | 'off' | null;

export type SpoilerMode = 'off' | 'live' | 'reread' | 'imported';

export interface WikiNamespace {
  /** `group:`+Book.groupId (md5 of library group path) or `book:`+metaHash|hash */
  id: string;
  kind: WikiNamespaceKind;
  title: string;
  /** 1 forces spoiler gating regardless of readingStatus */
  importedMode: 0 | 1;
  /** Per-namespace spoiler override (see SpoilerOverride) */
  spoilerOverride: SpoilerOverride;
  /** Denormalized list of book hashes in this namespace */
  bookHashes: string[];
  createdAt: number;
  updatedAt: number;
}

/** Built from reader + library state for spoiler gating (see wikiSpoiler.ts). */
export interface SpoilerContext {
  namespace: WikiNamespace;
  activeBookKey: string | null;
  activeBookHash: string | null;
  activeLocation: string | null;
  booksByHash: Map<string, Book>;
}

export interface WikiPage {
  id: string;
  namespaceId: string;
  title: string;
  /** UNIQUE per namespaceId */
  titleSlug: string;
  pageType: WikiPageType | null;
  summaryMarkdown: string;
  firstSeenCfi: string | null;
  firstSeenBookHash: string | null;
  isGhost: 0 | 1;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface WikiBlock {
  id: string;
  pageId: string;
  bookHash: string;
  cfi: string;
  xpointer0: string | null;
  xpointer1: string | null;
  quoteText: string | null;
  noteMarkdown: string | null;
  /** Serialized to tags_json in SQLite */
  tagIds: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface WikiTag {
  id: string;
  namespaceId: string;
  tagName: string;
  builtInType: WikiPageType | null;
  updatedAt?: number;
  deletedAt?: number | null;
}

export interface WikiLink {
  sourcePageId: string;
  targetPageId: string;
  /** null when link is from page summary (stored as '' in DB for PK) */
  sourceBlockId: string | null;
  updatedAt?: number;
  deletedAt?: number | null;
}

/** Global section labels shared across all wiki namespaces (quick capture + future UI). */
export interface WikiSectionCatalogEntry {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number | null;
}

/** Rows gathered for push or merged after pull (Phase 8 sync). */
export interface WikiSyncLocalPayload {
  namespaces: WikiNamespace[];
  pages: WikiPage[];
  blocks: WikiBlock[];
  tags: WikiTag[];
  links: WikiLink[];
  sectionCatalog: WikiSectionCatalogEntry[];
}

/** Portable wiki export (Phase 6). */
export interface WikiExportV1 {
  format: 'readest.wiki';
  version: 1;
  exportedAt: number;
  appVersion: string;
  namespace: {
    title: string;
    kind: WikiNamespaceKind;
    bookHashes: string[];
  };
  pages: WikiPage[];
  blocks: WikiBlock[];
  tags: WikiTag[];
  links: WikiLink[];
  /** Section catalog rows referenced by tag names (subset of global catalog). */
  sectionCatalog: { name: string; sortOrder: number }[];
}
