export type WikiNamespaceKind = 'series' | 'standalone';

export type WikiPageType = 'Person' | 'Location' | 'Faction' | 'Item' | 'Concept' | 'Lore' | 'Misc';

export interface WikiNamespace {
  /** md5Fingerprint('series:'+name) or 'book:'+metaHash/hash */
  id: string;
  kind: WikiNamespaceKind;
  title: string;
  /** 1 forces spoiler gating regardless of readingStatus */
  importedMode: 0 | 1;
  /** Denormalized list of book hashes in this namespace */
  bookHashes: string[];
  createdAt: number;
  updatedAt: number;
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
}

export interface WikiLink {
  sourcePageId: string;
  targetPageId: string;
  /** null when link is from page summary (stored as '' in DB for PK) */
  sourceBlockId: string | null;
}
