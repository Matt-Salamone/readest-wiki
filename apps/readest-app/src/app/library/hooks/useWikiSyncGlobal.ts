import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEnv } from '@/context/EnvContext';
import { useSync } from '@/hooks/useSync';
import { useLibraryStore } from '@/store/libraryStore';
import { useWikiStore } from '@/store/wikiStore';
import { WikiStore } from '@/services/wiki';

/**
 * Full wiki pull on library load (mirrors useBooksSync pull), then merge into local wiki.db.
 */
export const useWikiSyncGlobal = () => {
  const { user } = useAuth();
  const { appService } = useEnv();
  const { libraryLoaded } = useLibraryStore();
  const { syncWiki, useSyncInited: useSyncInitedFlag, syncedWikiPayload } = useSync();

  const invalidateAll = useWikiStore((s) => s.invalidateAll);
  const loadAllNamespaces = useWikiStore((s) => s.loadAllNamespaces);

  useEffect(() => {
    if (!user || !useSyncInitedFlag || !libraryLoaded) return;
    void syncWiki(undefined, 'pull');
  }, [user, useSyncInitedFlag, libraryLoaded, syncWiki]);

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
    void wiki.mergePulledRows(syncedWikiPayload).then(() => {
      invalidateAll();
      void loadAllNamespaces(wiki);
    });
  }, [syncedWikiPayload, appService, user, invalidateAll, loadAllNamespaces]);
};
