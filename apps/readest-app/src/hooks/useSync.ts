import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnv } from '@/context/EnvContext';
import { useSyncContext } from '@/context/SyncContext';
import {
  SyncData,
  SyncOp,
  SyncResult,
  SyncType,
  WikiSyncPayload,
  WikiSyncResult,
} from '@/libs/sync';
import { useSettingsStore } from '@/store/settingsStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { transformBookConfigFromDB } from '@/utils/transform';
import { transformBookNoteFromDB } from '@/utils/transform';
import { transformBookFromDB } from '@/utils/transform';
import {
  transformWikiBlockFromDB,
  transformWikiLinkFromDB,
  transformWikiNamespaceFromDB,
  transformWikiPageFromDB,
  transformWikiSectionCatalogFromDB,
  transformWikiTagFromDB,
} from '@/utils/transform';
import { DBBook, DBBookConfig, DBBookNote } from '@/types/records';
import { Book, BookConfig, BookDataRecord, BookNote } from '@/types/book';
import { navigateToLogin } from '@/utils/nav';
import { useReaderStore } from '@/store/readerStore';
import type { WikiSyncLocalPayload } from '@/types/wiki';

const transformsFromDB = {
  books: transformBookFromDB,
  notes: transformBookNoteFromDB,
  configs: transformBookConfigFromDB,
};

const computeMaxTimestamp = (records: BookDataRecord[]): number => {
  let maxTime = 0;
  for (const rec of records) {
    if (rec.updated_at) {
      const updatedTime = new Date(rec.updated_at).getTime();
      maxTime = Math.max(maxTime, updatedTime);
    }
    if (rec.deleted_at) {
      const deletedTime = new Date(rec.deleted_at).getTime();
      maxTime = Math.max(maxTime, deletedTime);
    }
  }
  return maxTime;
};

const computeMaxWikiTimestamp = (wiki: WikiSyncResult): number => {
  let maxTime = 0;
  const arrays = [
    wiki.namespaces,
    wiki.pages,
    wiki.blocks,
    wiki.tags,
    wiki.links,
    wiki.section_catalog,
  ];
  for (const arr of arrays) {
    for (const rec of arr) {
      if (rec.updated_at) {
        maxTime = Math.max(maxTime, new Date(rec.updated_at).getTime());
      }
      if (rec.deleted_at) {
        maxTime = Math.max(maxTime, new Date(rec.deleted_at).getTime());
      }
    }
  }
  return maxTime;
};

const wikiPayloadNonEmpty = (w: WikiSyncPayload | undefined): boolean => {
  if (!w) return false;
  return (
    (w.namespaces?.length ?? 0) +
      (w.pages?.length ?? 0) +
      (w.blocks?.length ?? 0) +
      (w.tags?.length ?? 0) +
      (w.links?.length ?? 0) +
      (w.section_catalog?.length ?? 0) >
    0
  );
};

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
export function useSync(bookKey?: string) {
  const router = useRouter();
  const { envConfig } = useEnv();
  const { settings, setSettings, saveSettings } = useSettingsStore();
  const { getConfig, setConfig } = useBookDataStore();
  const { setIsSyncing } = useReaderStore();
  const config = bookKey ? getConfig(bookKey) : null;

  const [syncingBooks, setSyncingBooks] = useState(false);
  const [syncingConfigs, setSyncingConfigs] = useState(false);
  const [syncingNotes, setSyncingNotes] = useState(false);
  const [syncingWiki, setSyncingWiki] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAtBooks, setLastSyncedAtBooks] = useState<number>(0);
  const [lastSyncedAtConfigs, setLastSyncedAtConfigs] = useState<number>(0);
  const [lastSyncedAtNotes, setLastSyncedAtNotes] = useState<number>(0);
  const [lastSyncedAtWiki, setLastSyncedAtWiki] = useState<number>(0);
  const [lastSyncedAtInited, setLastSyncedAtInited] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult>({
    books: null,
    configs: null,
    notes: null,
    wiki: null,
  });
  const [syncedBooks, setSyncedBooks] = useState<Book[] | null>(null);
  const [syncedConfigs, setSyncedConfigs] = useState<BookConfig[] | null>(null);
  const [syncedNotes, setSyncedNotes] = useState<BookNote[] | null>(null);
  const [syncedWikiPayload, setSyncedWikiPayload] = useState<WikiSyncLocalPayload | null>(null);

  const { syncClient } = useSyncContext();

  useEffect(() => {
    if (!bookKey) return;
    setIsSyncing(bookKey, syncing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey, syncing]);

  useEffect(() => {
    if (!settings.version) return;
    if (bookKey && !config?.location) return;
    if (lastSyncedAtInited) return;

    const lastSyncedBooksAt = settings.lastSyncedAtBooks ?? 0;
    const lastSyncedConfigsAt = config?.lastSyncedAtConfig ?? settings.lastSyncedAtConfigs ?? 0;
    const lastSyncedNotesAt = config?.lastSyncedAtNotes ?? settings.lastSyncedAtNotes ?? 0;
    const lastSyncedWikiAt = settings.lastSyncedAtWiki ?? 0;
    const now = Date.now();
    setLastSyncedAtBooks(
      now - lastSyncedBooksAt > 3 * ONE_DAY_IN_MS ? 0 : lastSyncedBooksAt - ONE_DAY_IN_MS,
    );
    setLastSyncedAtConfigs(
      now - lastSyncedConfigsAt > 3 * ONE_DAY_IN_MS ? 0 : lastSyncedConfigsAt - ONE_DAY_IN_MS,
    );
    setLastSyncedAtNotes(
      now - lastSyncedNotesAt > 3 * ONE_DAY_IN_MS ? 0 : lastSyncedNotesAt - ONE_DAY_IN_MS,
    );
    setLastSyncedAtWiki(
      now - lastSyncedWikiAt > 3 * ONE_DAY_IN_MS ? 0 : lastSyncedWikiAt - ONE_DAY_IN_MS,
    );
    setLastSyncedAtInited(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey, settings, config]);

  const pullChanges = async (
    type: SyncType,
    since: number,
    setLastSyncedAt: React.Dispatch<React.SetStateAction<number>>,
    setSyncing: React.Dispatch<React.SetStateAction<boolean>>,
    bookId?: string,
    metaHash?: string,
  ) => {
    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncClient.pullChanges(since, type, bookId, metaHash);

      if (type === 'wiki') {
        setSyncResult((prev) => ({ ...prev, wiki: result.wiki ?? null }));
        const w = result.wiki;
        const total = w
          ? w.namespaces.length +
            w.pages.length +
            w.blocks.length +
            w.tags.length +
            w.links.length +
            w.section_catalog.length
          : 0;
        if (since > 1000 && total === 0) return 0;
        const maxTime = total > 0 && w ? computeMaxWikiTimestamp(w) : Date.now();
        setLastSyncedAt(maxTime);
        const st = useSettingsStore.getState().settings;
        st.lastSyncedAtWiki = maxTime;
        setSettings(st);
        return total;
      }

      setSyncResult((prev) => ({ ...prev, [type]: result[type as Exclude<SyncType, 'wiki'>] }));
      const records = result[type as Exclude<SyncType, 'wiki'>] as BookDataRecord[] | null;
      if (since > 1000 && !records?.length) return 0;
      const maxTime = records?.length ? computeMaxTimestamp(records) : Date.now();
      setLastSyncedAt(maxTime);

      const st = useSettingsStore.getState().settings;
      switch (type) {
        case 'books':
          st.lastSyncedAtBooks = maxTime;
          setSettings(st);
          break;
        case 'configs':
          if (!bookId) {
            st.lastSyncedAtConfigs = maxTime;
            setSettings(st);
          } else if (bookKey) {
            setConfig(bookKey, { lastSyncedAtConfig: maxTime });
          }
          break;
        case 'notes':
          if (!bookId) {
            st.lastSyncedAtNotes = maxTime;
            setSettings(st);
          } else if (bookKey) {
            setConfig(bookKey, { lastSyncedAtNotes: maxTime });
          }
          break;
      }
      return records?.filter((rec) => !rec.deleted_at).length || 0;
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes('Not authenticated') && settings.keepLogin) {
          const st = useSettingsStore.getState().settings;
          st.keepLogin = false;
          setSettings(st);
          navigateToLogin(router);
        }
        setSyncError(err.message || `Error pulling ${type}`);
      } else {
        setSyncError(`Error pulling ${type}`);
      }
      return 0;
    } finally {
      setSyncing(false);
      await saveSettings(envConfig, useSettingsStore.getState().settings);
    }
  };

  const pushChanges = async (payload: SyncData): Promise<boolean> => {
    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncClient.pushChanges(payload);
      setSyncResult(result);
      return true;
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setSyncError(err.message || 'Error pushing changes');
      } else {
        setSyncError('Error pushing changes');
      }
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const syncBooks = useCallback(
    async (books?: Book[], op: SyncOp = 'both', since?: number) => {
      if (!lastSyncedAtInited) return;
      if ((op === 'push' || op === 'both') && books?.length) {
        await pushChanges({ books });
      }
      if (op === 'pull' || op === 'both') {
        return await pullChanges(
          'books',
          since ?? lastSyncedAtBooks + 1,
          setLastSyncedAtBooks,
          setSyncingBooks,
        );
      }
      return;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastSyncedAtInited, lastSyncedAtBooks],
  );

  const syncConfigs = useCallback(
    async (bookConfigs?: BookConfig[], bookId?: string, metaHash?: string, op: SyncOp = 'both') => {
      if (!bookId && !lastSyncedAtInited) return;
      if ((op === 'push' || op === 'both') && bookConfigs?.length) {
        const pushed = await pushChanges({ configs: bookConfigs });
        if (pushed && bookId && bookKey) {
          setConfig(bookKey, { lastPushedAtConfig: Date.now() });
        }
      }
      if (op === 'pull' || op === 'both') {
        await pullChanges(
          'configs',
          lastSyncedAtConfigs,
          setLastSyncedAtConfigs,
          setSyncingConfigs,
          bookId,
          metaHash,
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastSyncedAtInited, lastSyncedAtConfigs],
  );

  const syncNotes = useCallback(
    async (bookNotes?: BookNote[], bookId?: string, metaHash?: string, op: SyncOp = 'both') => {
      if (!lastSyncedAtInited) return;
      if ((op === 'push' || op === 'both') && bookNotes?.length) {
        const pushed = await pushChanges({ notes: bookNotes });
        if (pushed && bookId && bookKey) {
          setConfig(bookKey, { lastPushedAtNotes: Date.now() });
        }
      }
      if (op === 'pull' || op === 'both') {
        await pullChanges(
          'notes',
          lastSyncedAtNotes,
          setLastSyncedAtNotes,
          setSyncingNotes,
          bookId,
          metaHash,
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastSyncedAtInited, lastSyncedAtNotes],
  );

  const syncWiki = useCallback(
    async (wikiPayload?: WikiSyncPayload, op: SyncOp = 'both', since?: number) => {
      if (!lastSyncedAtInited && (op === 'pull' || op === 'both')) return;
      if ((op === 'push' || op === 'both') && wikiPayloadNonEmpty(wikiPayload)) {
        const pushed = await pushChanges({ wiki: wikiPayload });
        if (pushed && bookKey) {
          setConfig(bookKey, { lastPushedAtWiki: Date.now() });
        }
      }
      if (op === 'pull' || op === 'both') {
        await pullChanges(
          'wiki',
          since ?? lastSyncedAtWiki + 1,
          setLastSyncedAtWiki,
          setSyncingWiki,
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastSyncedAtInited, lastSyncedAtWiki, bookKey],
  );

  useEffect(() => {
    if (!syncing && syncResult) {
      const {
        books: dbBooks,
        configs: dbBookConfigs,
        notes: dbBookNotes,
        wiki: dbWiki,
      } = syncResult;
      const books = dbBooks?.map((dbBook) =>
        transformsFromDB['books'](dbBook as unknown as DBBook),
      );
      const configs = dbBookConfigs?.map((dbBookConfig) =>
        transformsFromDB['configs'](dbBookConfig as unknown as DBBookConfig),
      );
      const notes = dbBookNotes?.map((dbBookNote) =>
        transformsFromDB['notes'](dbBookNote as unknown as DBBookNote),
      );
      if (books) setSyncedBooks(books);
      if (configs) setSyncedConfigs(configs);
      if (notes) setSyncedNotes(notes);
      if (dbWiki) {
        const payload: WikiSyncLocalPayload = {
          namespaces: dbWiki.namespaces.map(transformWikiNamespaceFromDB),
          pages: dbWiki.pages.map(transformWikiPageFromDB),
          blocks: dbWiki.blocks.map(transformWikiBlockFromDB),
          tags: dbWiki.tags.map(transformWikiTagFromDB),
          links: dbWiki.links.map(transformWikiLinkFromDB),
          sectionCatalog: dbWiki.section_catalog.map(transformWikiSectionCatalogFromDB),
        };
        const total =
          payload.namespaces.length +
          payload.pages.length +
          payload.blocks.length +
          payload.tags.length +
          payload.links.length +
          payload.sectionCatalog.length;
        setSyncedWikiPayload(total > 0 ? payload : null);
      }
    }
  }, [syncResult, syncing]);

  return {
    syncing: syncingBooks || syncingConfigs || syncingNotes || syncingWiki,
    syncError,
    syncResult,
    syncedBooks,
    syncedConfigs,
    syncedNotes,
    syncedWikiPayload,
    lastSyncedAtBooks,
    lastSyncedAtNotes,
    lastSyncedAtConfigs,
    lastSyncedAtWiki,
    useSyncInited: lastSyncedAtInited,
    pullChanges,
    pushChanges,
    syncBooks,
    syncConfigs,
    syncNotes,
    syncWiki,
  };
}
