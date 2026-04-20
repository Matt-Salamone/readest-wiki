import { create } from 'zustand';
import type { Book } from '@/types/book';
import type { WikiNamespace, WikiPage, WikiBlock, WikiTag } from '@/types/wiki';
import type { WikiStore } from '@/services/wiki';

/** SQLite (Turso/libsql) only allows one in-flight connection per wiki DB — queue loads to avoid "concurrent use forbidden". */
let wikiNamespaceLoadChain: Promise<unknown> = Promise.resolve();

export interface WikiNamespaceCache {
  namespace: WikiNamespace;
  pages: Record<string, WikiPage>;
  blocksByPage: Record<string, WikiBlock[]>;
  tags: Record<string, WikiTag>;
}

interface WikiState {
  activeNamespaceId: string | null;
  caches: Record<string, WikiNamespaceCache>;
  loadNamespace: (store: WikiStore, book: Book) => Promise<WikiNamespace>;
  setActiveNamespace: (id: string | null) => void;
  invalidatePage: (namespaceId: string, pageId: string) => void;
  invalidateNamespace: (namespaceId: string) => void;
}

export const useWikiStore = create<WikiState>((set, get) => ({
  activeNamespaceId: null,
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

    const run = wikiNamespaceLoadChain.then(() => task());
    wikiNamespaceLoadChain = run.catch(() => {});
    return run;
  },

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
}));
