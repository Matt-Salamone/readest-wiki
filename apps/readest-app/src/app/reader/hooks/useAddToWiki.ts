import { useCallback, useMemo } from 'react';
import { useEnv } from '@/context/EnvContext';
import { BookNote, FIXED_LAYOUT_FORMATS } from '@/types/book';
import type { WikiBlock, WikiPage, WikiPageType } from '@/types/wiki';
import { WikiStore } from '@/services/wiki';
import { useBookDataStore } from '@/store/bookDataStore';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWikiStore } from '@/store/wikiStore';
import { uniqueId } from '@/utils/misc';
import { getXPointerFromCFI } from '@/utils/xcfi';

export type AddToWikiTarget =
  | { kind: 'existing'; pageId: string }
  | { kind: 'new'; title: string; pageType?: WikiPageType | null };

export interface AddToWikiInput {
  targetPage: AddToWikiTarget;
  /** Null for header quick-note without an anchor */
  cfi: string | null;
  quoteText: string | null;
  noteMarkdown: string | null;
  tagNames: string[];
}

export function useAddToWiki(bookKey: string) {
  const { envConfig, appService } = useEnv();
  const { getBookData, getConfig, saveConfig, updateBooknotes } = useBookDataStore();
  const { getView, getViewsById, getProgress } = useReaderStore();
  const { settings } = useSettingsStore();
  const loadNamespace = useWikiStore((s) => s.loadNamespace);
  const invalidateNamespace = useWikiStore((s) => s.invalidateNamespace);

  const wikiService = useMemo(() => (appService ? new WikiStore(appService) : null), [appService]);

  const addToWiki = useCallback(
    async (input: AddToWikiInput) => {
      if (!wikiService || !appService) {
        throw new Error('App service not ready');
      }
      const bookData = getBookData(bookKey);
      const book = bookData?.book;
      if (!book) {
        throw new Error('Book not loaded');
      }

      const namespace = await wikiService.resolveNamespaceForBook(book);
      const namespaceId = namespace.id;

      let page: WikiPage;
      if (input.targetPage.kind === 'existing') {
        const existing = await wikiService.getPage(input.targetPage.pageId);
        if (!existing) {
          throw new Error('Wiki page not found');
        }
        page = existing;
      } else {
        page = await wikiService.createPage({
          namespaceId,
          title: input.targetPage.title,
          pageType: input.targetPage.pageType ?? null,
          firstSeenCfi: input.cfi,
          firstSeenBookHash: book.hash,
        });
      }

      const tagIds: string[] = [];
      for (const raw of input.tagNames) {
        const tagName = raw.trim();
        if (!tagName) continue;
        const tag = await wikiService.createTag({ namespaceId, tagName });
        tagIds.push(tag.id);
      }

      const noteMd = input.noteMarkdown?.trim() ? input.noteMarkdown.trim() : null;
      const cfiStr = input.cfi?.trim() ? input.cfi.trim() : null;
      const quote = input.quoteText?.trim() ? input.quoteText.trim() : null;
      const shouldCreateBlock = Boolean(cfiStr) || Boolean(noteMd) || tagIds.length > 0;

      let createdBlock: WikiBlock | null = null;
      if (shouldCreateBlock) {
        let xpointer0: string | null = null;
        let xpointer1: string | null = null;
        if (cfiStr && !FIXED_LAYOUT_FORMATS.has(book.format)) {
          try {
            const view = getView(bookKey);
            const contents = view?.renderer.getContents() ?? [];
            const primaryIndex = view?.renderer.primaryIndex;
            const content = contents.find((x) => x.index === primaryIndex) ?? contents[0];
            if (content?.doc) {
              const xpResult = await getXPointerFromCFI(
                cfiStr,
                content.doc,
                content.index ?? 0,
                bookData.bookDoc ?? undefined,
              );
              xpointer0 = xpResult.pos0 || xpResult.xpointer || null;
              xpointer1 = xpResult.pos1 ?? null;
            }
          } catch {
            // Non-fatal: persist CFI-only block
          }
        }

        createdBlock = await wikiService.createBlock({
          pageId: page.id,
          bookHash: book.hash,
          cfi: cfiStr ?? '',
          xpointer0,
          xpointer1,
          quoteText: quote,
          noteMarkdown: noteMd,
          tagIds,
        });
        await wikiService.upsertWikiLinks(page.id, createdBlock.id, noteMd ?? '', namespaceId);
      }

      await wikiService.upsertWikiLinks(page.id, null, page.summaryMarkdown, namespaceId);

      invalidateNamespace(namespaceId);
      await loadNamespace(wikiService, book);

      if (cfiStr && quote) {
        const config = getConfig(bookKey);
        if (config && envConfig) {
          const progress = getProgress(bookKey);
          const annotations = [...(config.booknotes ?? [])];
          const cfi = cfiStr;
          const style = 'highlight' as const;
          const color = settings.globalReadSettings.highlightStyles[style];
          const annotation: BookNote = {
            id: uniqueId(),
            type: 'annotation',
            cfi,
            style,
            color,
            text: quote,
            note: '',
            page: progress?.page,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const existingIndex = annotations.findIndex(
            (a) => a.cfi === cfi && a.type === 'annotation' && a.style && !a.deletedAt,
          );
          if (existingIndex === -1) {
            annotations.push(annotation);
            const views = getViewsById(bookKey.split('-')[0]!);
            views.forEach((v) => v?.addAnnotation(annotation));
            const updatedConfig = updateBooknotes(bookKey, annotations);
            if (updatedConfig) {
              saveConfig(envConfig, bookKey, updatedConfig, settings);
            }
          }
        }
      }

      return { page: (await wikiService.getPage(page.id)) ?? page, block: createdBlock };
    },
    [
      wikiService,
      appService,
      getBookData,
      bookKey,
      getConfig,
      getProgress,
      settings,
      getView,
      getViewsById,
      envConfig,
      saveConfig,
      updateBooknotes,
      loadNamespace,
      invalidateNamespace,
    ],
  );

  return { addToWiki };
}
