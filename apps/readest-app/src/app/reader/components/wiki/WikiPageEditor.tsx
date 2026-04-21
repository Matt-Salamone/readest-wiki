'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import TextEditor from '@/components/TextEditor';
import type { TextEditorRef } from '@/components/TextEditor';
import { WikiStore } from '@/services/wiki';
import type { WikiBlock, WikiPage, WikiPageType, WikiTag } from '@/types/wiki';
import { eventDispatcher } from '@/utils/event';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useWikiPanelStore } from '@/store/wikiPanelStore';
import WikiMarkdown from '@/app/reader/components/wiki/WikiMarkdown';
import WikiBlockList from '@/app/reader/components/wiki/WikiBlockList';
import WikiBracketSuggest from '@/app/reader/components/wiki/WikiBracketSuggest';
import { WIKI_PAGE_TYPES } from '@/app/reader/components/wiki/wikiPageTypes';
import {
  acceptWikiBracketTitle,
  getWikiBracketSuggestContext,
} from '@/app/reader/hooks/useWikiLinkSuggest';
import { getTextareaCaretOffset } from '@/utils/textareaCaret';
import { confirmWikiDeletion } from '@/app/reader/components/wiki/wikiConfirmDelete';
import { WIKI_TEXTAREA_FOCUS_WRAP } from '@/app/reader/components/wiki/wikiEditorClasses';

interface WikiPageEditorProps {
  /** When null (global /wiki), Jump on blocks opens the reader with `cfi`. */
  bookKey: string | null;
  pageId: string | null;
  namespaceId: string | null;
  wiki: WikiStore | null;
  pages: Record<string, WikiPage>;
  blocks: WikiBlock[];
  tagsById: Record<string, WikiTag>;
  onReload: () => Promise<void>;
  /** If set (e.g. /wiki), used instead of wiki panel store for page selection. */
  onSelectPage?: (pageId: string | null) => void;
}

const WikiPageEditor: React.FC<WikiPageEditorProps> = ({
  bookKey,
  pageId,
  namespaceId,
  wiki,
  pages,
  blocks,
  tagsById,
  onReload,
  onSelectPage,
}) => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const setActivePageId = useWikiPanelStore((s) => s.setActivePageId);

  const [titleDraft, setTitleDraft] = useState('');
  const [summaryMode, setSummaryMode] = useState<'view' | 'edit'>('view');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [summaryCaret, setSummaryCaret] = useState(0);
  const summaryRef = useRef<TextEditorRef | null>(null);

  const page = pageId ? pages[pageId] : null;

  const pagesList = useMemo(() => Object.values(pages), [pages]);

  const pagesBySlug = useMemo(() => {
    const m = new Map<string, WikiPage>();
    for (const p of pagesList) {
      m.set(p.titleSlug, p);
    }
    return m;
  }, [pagesList]);

  useEffect(() => {
    if (page) {
      setTitleDraft(page.title);
      setSummaryDraft(page.summaryMarkdown ?? '');
      setSummaryMode('view');
    }
  }, [page?.id, page?.title, page?.summaryMarkdown]);

  const reloadWiki = onReload;

  const suggestCtx = useMemo(
    () => getWikiBracketSuggestContext(summaryDraft, summaryCaret),
    [summaryDraft, summaryCaret],
  );

  const summarySuggestItems = useMemo(() => {
    if (!suggestCtx?.active || summaryMode !== 'edit') return [];
    const q = suggestCtx.query.trim().toLowerCase();
    const list = !q ? pagesList : pagesList.filter((p) => p.title.toLowerCase().includes(q));
    return list.slice(0, 12).map((p) => ({
      id: p.id,
      title: p.title,
      isGhost: p.isGhost === 1,
    }));
  }, [suggestCtx, summaryMode, pagesList]);

  let summarySuggestPos = { top: 0, left: 0 };
  if (
    suggestCtx?.active &&
    summaryMode === 'edit' &&
    summarySuggestItems.length > 0 &&
    summaryRef.current?.getElement()
  ) {
    const el = summaryRef.current.getElement()!;
    const coords = getTextareaCaretOffset(el, summaryCaret);
    summarySuggestPos = { top: coords.top + 4, left: coords.left };
  }

  const handleNavigateToPage = useCallback(
    (id: string) => {
      if (onSelectPage) {
        onSelectPage(id);
      } else {
        setActivePageId(id);
      }
    },
    [onSelectPage, setActivePageId],
  );

  const commitTitle = async () => {
    if (!wiki || !page || !namespaceId) return;
    const next = titleDraft.trim();
    if (!next || next === page.title) return;
    const renamed = await wiki.renamePage(page.id, next);
    if (!renamed) {
      eventDispatcher.dispatch('toast', {
        message: _('A page with that title already exists.'),
        type: 'error',
      });
      setTitleDraft(page.title);
      return;
    }
    await reloadWiki();
  };

  const saveSummary = async () => {
    if (!wiki || !page || !namespaceId) return;
    await wiki.updatePage(page.id, { summaryMarkdown: summaryDraft });
    await wiki.upsertWikiLinks(page.id, null, summaryDraft, namespaceId);
    await reloadWiki();
  };

  const handleDeletePage = async () => {
    if (!wiki || !page) return;
    if (
      !(await confirmWikiDeletion(
        appService,
        _('Delete this wiki page and keep linked text unchanged?'),
      ))
    ) {
      return;
    }
    await wiki.softDeletePage(page.id);
    if (onSelectPage) {
      onSelectPage(null);
    } else {
      setActivePageId(null);
    }
    await reloadWiki();
  };

  const handleInitGhost = async () => {
    if (!wiki || !page) return;
    await wiki.updatePage(page.id, { isGhost: 0 });
    await reloadWiki();
  };

  const handlePageTypeChange = async (t: WikiPageType) => {
    if (!wiki || !page) return;
    await wiki.updatePage(page.id, { pageType: t });
    await reloadWiki();
  };

  if (!pageId || !page || !namespaceId || !wiki) {
    return (
      <div className='text-base-content/70 flex flex-1 items-center justify-center p-6 text-sm'>
        {_('Select a wiki page')}
      </div>
    );
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-2'>
      <div className='mb-3'>
        <label className='label py-0' htmlFor='wiki-page-title'>
          <span className='label-text text-xs font-semibold'>{_('Title')}</span>
        </label>
        <input
          id='wiki-page-title'
          type='text'
          className='input input-bordered input-sm mb-2 w-full'
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => void commitTitle()}
        />

        <label className='label py-0' htmlFor='wiki-page-type'>
          <span className='label-text text-xs font-semibold'>{_('Page type')}</span>
        </label>
        <select
          id='wiki-page-type'
          className='select select-bordered select-sm mb-3 w-full max-w-xs'
          value={page.pageType ?? 'Misc'}
          onChange={(e) => void handlePageTypeChange(e.target.value as WikiPageType)}
        >
          {WIKI_PAGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {page.isGhost === 1 ? (
          <div className='mb-3'>
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={() => void handleInitGhost()}
            >
              {_('Initialize this page')}
            </button>
            <p className='text-base-content/60 mt-1 text-xs'>
              {_('Draft pages are created when you link to a new name.')}
            </p>
          </div>
        ) : null}

        <div className='mb-1 flex flex-wrap items-center gap-2'>
          <span className='text-xs font-semibold'>{_('Summary')}</span>
          <div className='join'>
            <button
              type='button'
              className={clsx('btn join-item btn-xs', summaryMode === 'view' && 'btn-active')}
              onClick={() => {
                void (async () => {
                  if (summaryMode === 'edit') {
                    await saveSummary();
                  }
                  setSummaryMode('view');
                })();
              }}
            >
              {_('View')}
            </button>
            <button
              type='button'
              className={clsx('btn join-item btn-xs', summaryMode === 'edit' && 'btn-active')}
              onClick={() => {
                setSummaryDraft(page.summaryMarkdown ?? '');
                setSummaryMode('edit');
              }}
            >
              {_('Edit')}
            </button>
          </div>
        </div>

        {summaryMode === 'view' ? (
          <WikiMarkdown
            markdown={page.summaryMarkdown ?? ''}
            pagesBySlug={pagesBySlug}
            onWikiPageNavigate={handleNavigateToPage}
            className='text-sm'
          />
        ) : (
          <div className={clsx('relative', WIKI_TEXTAREA_FOCUS_WRAP)}>
            <TextEditor
              ref={summaryRef}
              value={summaryDraft}
              onChange={setSummaryDraft}
              onCaretChange={(caret) => setSummaryCaret(caret)}
              minRows={4}
              maxRows={20}
              className='textarea textarea-bordered w-full font-mono text-sm'
              onSave={() => void saveSummary()}
            />
            <WikiBracketSuggest
              open={Boolean(suggestCtx?.active && summarySuggestItems.length > 0)}
              top={summarySuggestPos.top}
              left={summarySuggestPos.left}
              items={summarySuggestItems}
              onPick={(title) => {
                const c = getWikiBracketSuggestContext(summaryDraft, summaryCaret);
                if (!c?.active) return;
                const { nextValue, nextCaret } = acceptWikiBracketTitle(
                  summaryDraft,
                  summaryCaret,
                  c,
                  title,
                );
                setSummaryDraft(nextValue);
                setSummaryCaret(nextCaret);
                requestAnimationFrame(() => {
                  const el = summaryRef.current?.getElement();
                  if (el) {
                    el.focus();
                    el.setSelectionRange(nextCaret, nextCaret);
                  }
                });
              }}
            />
          </div>
        )}
      </div>

      <div className='flex justify-end'>
        <button
          type='button'
          className='btn btn-ghost btn-sm text-error'
          onClick={() => void handleDeletePage()}
        >
          {_('Delete page')}
        </button>
      </div>

      <WikiBlockList
        bookKey={bookKey}
        pageId={page.id}
        namespaceId={namespaceId}
        blocks={blocks}
        tagsById={tagsById}
        pagesBySlug={pagesBySlug}
        pagesList={pagesList}
        wiki={wiki}
        onReload={reloadWiki}
        onNavigateToPage={handleNavigateToPage}
      />
    </div>
  );
};

export default WikiPageEditor;
