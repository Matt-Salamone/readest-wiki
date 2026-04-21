import { create } from 'zustand';
import type { Book } from '@/types/book';
import type { WikiNamespace, WikiPage, WikiBlock, WikiTag } from '@/types/wiki';
import type { WikiStore } from '@/services/wiki';

/** SQLite (Turso/libsql) only allows one in-flight connection per wiki DB — serialize all wiki DB work. */
let wikiDbChain: Promise<unknown> = Promise.resolve();

/**
 * Depth of nested wiki DB work. `loadNamespace` / `loadNamespaceById` run inside this queue while
 * calling `WikiStore` methods that also use `runOnWikiDb` (via `withDb`). Without re-entrancy those
 * inner calls would deadlock waiting on the outer task.
 */
let wikiDbRunDepth = 0;

/** Chain wiki DB tasks so open/close cycles never overlap (fixes "concurrent use forbidden"). */
export function runOnWikiDb<T>(task: () => Promise<T>): Promise<T> {
  if (wikiDbRunDepth > 0) {
    return task();
  }
  const run = wikiDbChain.then(async () => {
    wikiDbRunDepth += 1;
    try {
      return await task();
    } finally {
      wikiDbRunDepth -= 1;
    }
  });
  wikiDbChain = run.catch(() => {});
  return run;
}

export interface WikiNamespaceCache {
  namespace: WikiNamespace;
  pages: Record<string, WikiPage>;
  blocksByPage: Record<string, WikiBlock[]>;
  tags: Record<string, WikiTag>;
}

interface WikiState {
  activeNamespaceId: string | null;
  allNamespaces: WikiNamespace[];
  caches: Record<string, WikiNamespaceCache>;
  loadNamespace: (store: WikiStore, book: Book) => Promise<WikiNamespace>;
  loadNamespaceById: (store: WikiStore, namespaceId: string) => Promise<WikiNamespace | null>;
  loadAllNamespaces: (store: WikiStore) => Promise<WikiNamespace[]>;
  /** Clear all cached wiki state (e.g. after backup restore replaces wiki.db). */
  invalidateAll: () => void;
  setActiveNamespace: (id: string | null) => void;
  invalidatePage: (namespaceId: string, pageId: string) => void;
  invalidateNamespace: (namespaceId: string) => void;
  upsertPageInCache: (namespaceId: string, page: WikiPage) => void;
  removePageFromCache: (namespaceId: string, pageId: string) => void;
  setBlocksForPageInCache: (namespaceId: string, pageId: string, blocks: WikiBlock[]) => void;
  removeBlockFromCache: (namespaceId: string, pageId: string, blockId: string) => void;
  upsertTagInCache: (namespaceId: string, tag: WikiTag) => void;
}

export const useWikiStore = create<WikiState>((set, get) => ({
  activeNamespaceId: null,
  allNamespaces: [],
  caches: {},

  loadNamespace: async (store: WikiStore, book: Book) => {
    const task = async () => {
      const namespace = await store.resolveNamespaceForBook(book);
      const namespaceId = namespace.id;

      const pages = await store.listPages(namespaceId);
      const tags = await store.listTags(namespaceId);

      const pagesRecord: Record<string, WikiPage> = {};
      for (const p of pages) {
        pagesRecord[p.id] = p;
      }

      const blocksByPage: Record<string, WikiBlock[]> = {};
      for (const p of pages) {
        blocksByPage[p.id] = await store.listBlocksForPage(p.id);
      }

      const tagsRecord: Record<string, WikiTag> = {};
      for (const t of tags) {
        tagsRecord[t.id] = t;
      }

      const cache: WikiNamespaceCache = {
        namespace,
        pages: pagesRecord,
        blocksByPage,
        tags: tagsRecord,
      };

      set((state) => ({
        activeNamespaceId: namespaceId,
        caches: { ...state.caches, [namespaceId]: cache },
      }));

      return namespace;
    };

    return runOnWikiDb(task);
  },

  loadNamespaceById: async (store: WikiStore, namespaceId: string) => {
    const task = async () => {
      const namespace = await store.getNamespace(namespaceId);
      if (!namespace) return null;

      const pages = await store.listPages(namespaceId);
      const tags = await store.listTags(namespaceId);

      const pagesRecord: Record<string, WikiPage> = {};
      for (const p of pages) {
        pagesRecord[p.id] = p;
      }

      const blocksByPage: Record<string, WikiBlock[]> = {};
      for (const p of pages) {
        blocksByPage[p.id] = await store.listBlocksForPage(p.id);
      }

      const tagsRecord: Record<string, WikiTag> = {};
      for (const t of tags) {
        tagsRecord[t.id] = t;
      }

      const cache: WikiNamespaceCache = {
        namespace,
        pages: pagesRecord,
        blocksByPage,
        tags: tagsRecord,
      };

      set((state) => ({
        activeNamespaceId: namespaceId,
        caches: { ...state.caches, [namespaceId]: cache },
      }));

      return namespace;
    };

    return runOnWikiDb(task);
  },

  loadAllNamespaces: async (store: WikiStore) => {
    const task = async () => {
      const list = await store.listAllNamespaces();
      set({ allNamespaces: list });
      return list;
    };
    return runOnWikiDb(task);
  },

  invalidateAll: () =>
    set({
      activeNamespaceId: null,
      allNamespaces: [],
      caches: {},
    }),

  setActiveNamespace: (id: string | null) => set({ activeNamespaceId: id }),

  invalidatePage: (namespaceId: string, pageId: string) => {
    const cache = get().caches[namespaceId];
    if (!cache) return;
    set((state) => {
      const c = state.caches[namespaceId];
      if (!c) return state;
      const nextPages = { ...c.pages };
      delete nextPages[pageId];
      const nextBlocks = { ...c.blocksByPage };
      delete nextBlocks[pageId];
      return {
        caches: {
          ...state.caches,
          [namespaceId]: { ...c, pages: nextPages, blocksByPage: nextBlocks },
        },
      };
    });
  },

  invalidateNamespace: (namespaceId: string) => {
    set((state) => {
      const next = { ...state.caches };
      delete next[namespaceId];
      return {
        caches: next,
        activeNamespaceId: state.activeNamespaceId === namespaceId ? null : state.activeNamespaceId,
      };
    });
  },

  upsertPageInCache: (namespaceId: string, page: WikiPage) => {
    set((state) => {
      const c = state.caches[namespaceId];
      if (!c) return state;
      return {
        caches: {
          ...state.caches,
          [namespaceId]: {
            ...c,
            pages: { ...c.pages, [page.id]: page },
          },
        },
      };
    });
  },

  removePageFromCache: (namespaceId: string, pageId: string) => {
    set((state) => {
      const c = state.caches[namespaceId];
      if (!c) return state;
      const nextPages = { ...c.pages };
      delete nextPages[pageId];
      const nextBlocks = { ...c.blocksByPage };
      delete nextBlocks[pageId];
      return {
        caches: {
          ...state.caches,
          [namespaceId]: { ...c, pages: nextPages, blocksByPage: nextBlocks },
        },
      };
    });
  },

  setBlocksForPageInCache: (namespaceId: string, pageId: string, blocks: WikiBlock[]) => {
    set((state) => {
      const c = state.caches[namespaceId];
      if (!c) return state;
      return {
        caches: {
          ...state.caches,
          [namespaceId]: {
            ...c,
            blocksByPage: { ...c.blocksByPage, [pageId]: blocks },
          },
        },
      };
    });
  },

  removeBlockFromCache: (namespaceId: string, pageId: string, blockId: string) => {
    set((state) => {
      const c = state.caches[namespaceId];
      if (!c) return state;
      const list = c.blocksByPage[pageId];
      if (!list) return state;
      const nextList = list.filter((b) => b.id !== blockId);
      return {
        caches: {
          ...state.caches,
          [namespaceId]: {
            ...c,
            blocksByPage: { ...c.blocksByPage, [pageId]: nextList },
          },
        },
      };
    });
  },

  upsertTagInCache: (namespaceId: string, tag: WikiTag) => {
    set((state) => {
      const c = state.caches[namespaceId];
      if (!c) return state;
      return {
        caches: {
          ...state.caches,
          [namespaceId]: {
            ...c,
            tags: { ...c.tags, [tag.id]: tag },
          },
        },
      };
    });
  },
}));
