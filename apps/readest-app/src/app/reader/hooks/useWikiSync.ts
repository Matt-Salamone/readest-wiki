import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEnv } from '@/context/EnvContext';
import { useSync } from '@/hooks/useSync';
import { useBookDataStore } from '@/store/bookDataStore';
import { useWikiStore } from '@/store/wikiStore';
import { WikiStore } from '@/services/wiki';
import { SYNC_NOTES_INTERVAL_SEC } from '@/services/constants';
import { throttle } from '@/utils/throttle';
import type { WikiSyncPayload } from '@/libs/sync';

function wikiPayloadNonEmpty(w: WikiSyncPayload): boolean {
  return (
    (w.namespaces?.length ?? 0) +
      (w.pages?.length ?? 0) +
      (w.blocks?.length ?? 0) +
      (w.tags?.length ?? 0) +
      (w.links?.length ?? 0) +
      (w.section_catalog?.length ?? 0) >
    0
  );
}

export const useWikiSync = (bookKey: string) => {
  const { user } = useAuth();
  const { appService } = useEnv();
  const { syncWiki, lastSyncedAtWiki, syncedWikiPayload } = useSync(bookKey);
  const getBookData = useBookDataStore((s) => s.getBookData);

  const wikiRef = useRef<WikiStore | null>(null);
  useEffect(() => {
    if (appService) {
      wikiRef.current = new WikiStore(appService);
    }
  }, [appService]);

  const invalidateAll = useWikiStore((s) => s.invalidateAll);
  const loadNamespaceById = useWikiStore((s) => s.loadNamespaceById);

  const handleAutoSync = useCallback(
    throttle(
      async () => {
        const book = getBookData(bookKey)?.book;
        const wiki = wikiRef.current;
        if (!user || !book || !wiki) return;

        const ns = await wiki.resolveNamespaceForBook(book);
        const local = await wiki.listChangesForNamespace(ns.id, lastSyncedAtWiki);
        const payload: WikiSyncPayload = {
          namespaces: local.namespaces,
          pages: local.pages,
          blocks: local.blocks,
          tags: local.tags,
          links: local.links,
          section_catalog: local.sectionCatalog,
        };
        if (wikiPayloadNonEmpty(payload)) {
          await syncWiki(payload, 'both');
        } else {
          await syncWiki(undefined, 'pull');
        }
      },
      SYNC_NOTES_INTERVAL_SEC * 1000,
      { emitLast: false },
    ),
    [syncWiki, lastSyncedAtWiki, getBookData, bookKey, user],
  );

  useEffect(() => {
    const book = getBookData(bookKey)?.book;
    if (!book || !user || !appService) return;
    handleAutoSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey, user, handleAutoSync]);

  useEffect(() => {
    if (!syncedWikiPayload || !appService || !user) return;
    const nonempty =
      syncedWikiPayload.namespaces.length +
        syncedWikiPayload.pages.length +
        syncedWikiPayload.blocks.length +
        syncedWikiPayload.tags.length +
        syncedWikiPayload.links.length +
        syncedWikiPayload.sectionCatalog.length >
      0;
    if (!nonempty) return;

    const wiki = new WikiStore(appService);
    const book = getBookData(bookKey)?.book;
    void wiki.mergePulledRows(syncedWikiPayload).then(() => {
      invalidateAll();
      if (book) {
        void wiki.resolveNamespaceForBook(book).then((ns) => {
          void loadNamespaceById(wiki, ns.id);
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedWikiPayload]);
};
