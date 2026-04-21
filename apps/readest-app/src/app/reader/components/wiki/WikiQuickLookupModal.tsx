'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { WikiStore } from '@/services/wiki';
import type { WikiNamespace, WikiPage } from '@/types/wiki';
import { buildWikiSpoilerContext, isPageVisible } from '@/app/reader/utils/wikiSpoiler';
import { useBookDataStore } from '@/store/bookDataStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useNotebookStore } from '@/store/notebookStore';
import { useReaderStore } from '@/store/readerStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useWikiPanelStore } from '@/store/wikiPanelStore';
import { suggestWikiPagesForQuickLookup } from '@/utils/wikiQuickLookupRank';

const WikiQuickLookupModal: React.FC = () => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const wiki = useMemo(() => (appService ? new WikiStore(appService) : null), [appService]);

  const isOpen = useWikiPanelStore((s) => s.isWikiQuickLookupOpen);
  const closeWikiQuickLookup = useWikiPanelStore((s) => s.closeWikiQuickLookup);
  const toggleWikiQuickLookup = useWikiPanelStore((s) => s.toggleWikiQuickLookup);
  const openWikiPanel = useWikiPanelStore((s) => s.open);

  const bookKeys = useReaderStore((s) => s.bookKeys);
  const sideBarBookKey = useSidebarStore((s) => s.sideBarBookKey);
  const getBookData = useBookDataStore((s) => s.getBookData);
  const library = useLibraryStore((s) => s.library);
  const setNotebookVisible = useNotebookStore((s) => s.setNotebookVisible);

  const effectiveBookKey = sideBarBookKey ?? bookKeys[0] ?? null;
  const book = effectiveBookKey ? getBookData(effectiveBookKey)?.book : undefined;
  const progressLocation = useReaderStore((s) =>
    effectiveBookKey ? (s.viewStates[effectiveBookKey]?.progress?.location ?? null) : null,
  );

  const [query, setQuery] = useState('');
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [wikiNamespace, setWikiNamespace] = useState<WikiNamespace | null>(null);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !wiki || !book) {
      setWikiNamespace(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ns = await wiki.resolveNamespaceForBook(book);
      const list = await wiki.listPages(ns.id);
      if (!cancelled) {
        setPages(list);
        setWikiNamespace(ns);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, wiki, book]);

  const spoilerCtx = useMemo(() => {
    if (!wikiNamespace || !book || !effectiveBookKey) return null;
    return buildWikiSpoilerContext(wikiNamespace, library, {
      activeBookKey: effectiveBookKey,
      activeBook: book,
      activeLocation: progressLocation,
    });
  }, [wikiNamespace, library, effectiveBookKey, book, progressLocation]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const ranked = suggestWikiPagesForQuickLookup(query, pages, 8);
    if (!spoilerCtx) return ranked;
    return ranked.filter((p) => isPageVisible(p, spoilerCtx));
  }, [query, pages, spoilerCtx]);

  useEffect(() => {
    setHighlight((h) => (items.length ? Math.min(h, items.length - 1) : 0));
  }, [items.length]);

  const pickPage = useCallback(
    (page: WikiPage) => {
      if (!effectiveBookKey) return;
      setNotebookVisible(false);
      openWikiPanel(effectiveBookKey, page.id);
      closeWikiQuickLookup();
    },
    [effectiveBookKey, openWikiPanel, closeWikiQuickLookup, setNotebookVisible],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K';
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleWikiQuickLookup();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWikiQuickLookup();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(0, items.length - 1)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }
      if (e.key === 'Enter' && items.length > 0) {
        e.preventDefault();
        pickPage(items[highlight]!);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, items, highlight, pickPage, closeWikiQuickLookup, toggleWikiQuickLookup]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className='fixed inset-0 z-[60] bg-black/40'
        role='presentation'
        aria-hidden
        onClick={() => closeWikiQuickLookup()}
      />
      <div
        className='border-base-300 bg-base-200 fixed left-1/2 top-[12%] z-[61] w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-xl border p-3 shadow-2xl'
        role='dialog'
        aria-modal='true'
        aria-label={_('Wiki quick lookup')}
        onClick={(e) => e.stopPropagation()}
      >
        {!book || !effectiveBookKey ? (
          <p className='text-base-content/70 text-sm'>{_('Open a book to search the wiki.')}</p>
        ) : (
          <>
            <input
              ref={inputRef}
              type='search'
              className='input input-bordered input-sm mb-2 w-full'
              placeholder={_('Search wiki pages')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-autocomplete='list'
              aria-controls='wiki-quick-lookup-list'
            />
            <ul id='wiki-quick-lookup-list' className='max-h-64 overflow-y-auto' role='listbox'>
              {items.map((p, i) => (
                <li key={p.id} role='option' aria-selected={i === highlight}>
                  <button
                    type='button'
                    className={clsx(
                      'hover:bg-base-300 mb-0.5 w-full rounded-md px-2 py-2 text-left text-sm',
                      i === highlight && 'bg-base-300',
                    )}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pickPage(p)}
                  >
                    <span className='line-clamp-2'>{p.title}</span>
                    <span className='text-base-content/60 text-xs'>
                      {p.pageType ?? 'Misc'}
                      {p.isGhost ? (
                        <span className='text-base-content/50 ml-1'>({_('draft')})</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
              {items.length === 0 ? (
                <li className='text-base-content/60 px-2 py-3 text-center text-sm'>
                  {_('No matching pages')}
                </li>
              ) : null}
            </ul>
            <p className='text-base-content/50 mt-2 text-xs'>
              {_('↑↓ Enter — open · Esc — close · Ctrl/Cmd+K — toggle')}
            </p>
          </>
        )}
      </div>
    </>
  );
};

export default WikiQuickLookupModal;
