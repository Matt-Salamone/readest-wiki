'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LuBookOpen } from 'react-icons/lu';

import TextEditor from '@/components/TextEditor';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { addToWikiForBook } from '@/app/reader/hooks/useAddToWiki';
import type { AddToWikiTarget } from '@/app/reader/hooks/useAddToWiki';
import { WikiStore, wikiTitleToSlug } from '@/services/wiki';
import { useWikiStore } from '@/store/wikiStore';
import { useAppRouter } from '@/hooks/useAppRouter';
import type { Book } from '@/types/book';
import type { WikiPage, WikiPageType, WikiSectionCatalogEntry } from '@/types/wiki';
import { eventDispatcher } from '@/utils/event';

const PAGE_TYPES: WikiPageType[] = [
  'Person',
  'Location',
  'Faction',
  'Item',
  'Concept',
  'Lore',
  'Misc',
];

interface LibraryWikiQuickNoteModalProps {
  book: Book | null;
  onClose: () => void;
}

const LibraryWikiQuickNoteModal: React.FC<LibraryWikiQuickNoteModalProps> = ({ book, onClose }) => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const router = useAppRouter();
  const loadNamespaceById = useWikiStore((s) => s.loadNamespaceById);
  const activeNamespaceId = useWikiStore((s) => s.activeNamespaceId);
  const caches = useWikiStore((s) => s.caches);

  const [pageSearch, setPageSearch] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [newPageType, setNewPageType] = useState<WikiPageType>('Misc');
  const [sectionCatalogEntries, setSectionCatalogEntries] = useState<WikiSectionCatalogEntry[]>([]);
  const [sectionSelect, setSectionSelect] = useState('');
  const [sectionNewInput, setSectionNewInput] = useState('');
  const [noteMarkdown, setNoteMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const visible = Boolean(book && appService);

  const resetForm = useCallback(() => {
    setPageSearch('');
    setSelectedPageId(null);
    setNewPageType('Misc');
    setSectionSelect('');
    setSectionNewInput('');
    setNoteMarkdown('');
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!book || !appService) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      resetForm();
      setLoading(true);
      setLoadError(null);
      try {
        const wiki = new WikiStore(appService);
        const ns = await wiki.resolveNamespaceForBook(book);
        await loadNamespaceById(wiki, ns.id);
        if (cancelled) return;
        const sections = await wiki.listSectionCatalog();
        if (!cancelled) {
          setSectionCatalogEntries(sections);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [book, appService, loadNamespaceById, resetForm]);

  const cache = activeNamespaceId ? caches[activeNamespaceId] : null;
  const pagesList = useMemo(() => {
    if (!cache) return [];
    return Object.values(cache.pages).sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    );
  }, [cache]);

  const filteredPages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    if (!q) return pagesList.slice(0, 50);
    return pagesList.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 50);
  }, [pagesList, pageSearch]);

  const slugMatchPage = useMemo(() => {
    const slug = wikiTitleToSlug(pageSearch.trim());
    if (!slug) return undefined;
    return pagesList.find((p) => p.titleSlug === slug);
  }, [pagesList, pageSearch]);

  const handlePickPage = (page: WikiPage) => {
    setSelectedPageId(page.id);
    setPageSearch(page.title);
  };

  const handleSave = async () => {
    if (!book || !appService) return;

    const titleTrim = pageSearch.trim();
    if (!titleTrim && !selectedPageId) {
      return;
    }

    let target: AddToWikiTarget;
    if (selectedPageId) {
      target = { kind: 'existing', pageId: selectedPageId };
    } else if (slugMatchPage) {
      target = { kind: 'existing', pageId: slugMatchPage.id };
    } else {
      if (!titleTrim) return;
      target = {
        kind: 'new',
        title: titleTrim,
        pageType: newPageType,
      };
    }

    const customSection = sectionNewInput.trim();
    const pickedSection = sectionSelect.trim();
    const sectionTag = customSection || pickedSection || null;

    setSaving(true);
    try {
      const wiki = new WikiStore(appService);
      await addToWikiForBook({
        wiki,
        book,
        loadNamespaceById,
        targetPage: target,
        noteMarkdown: noteMarkdown.trim() ? noteMarkdown : null,
        tagName: sectionTag,
      });
      eventDispatcher.dispatch('toast', {
        type: 'info',
        message: _('Added to wiki'),
      });
      onClose();
      resetForm();
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInWiki = () => {
    const pageId = selectedPageId ?? slugMatchPage?.id;
    if (!activeNamespaceId || !pageId) return;
    router.push(
      `/wiki?ns=${encodeURIComponent(activeNamespaceId)}&page=${encodeURIComponent(pageId)}`,
    );
    onClose();
    resetForm();
  };

  const handleDismiss = () => {
    onClose();
    resetForm();
  };

  const titleTrim = pageSearch.trim();
  const canSave = Boolean(selectedPageId) || Boolean(titleTrim);
  const showPageType = Boolean(titleTrim) && !selectedPageId && !slugMatchPage;

  if (!visible || !book) return null;

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4'
      role='presentation'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        className={clsx(
          'bg-base-100 border-base-300 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border p-4 shadow-xl',
        )}
        role='dialog'
        aria-labelledby='library-wiki-quick-note-title'
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id='library-wiki-quick-note-title'
          className='mb-1 flex items-center gap-2 text-lg font-semibold'
        >
          <LuBookOpen className='h-5 w-5' aria-hidden />
          {_('Add wiki note')}
        </h2>
        <p className='text-base-content/70 mb-3 text-sm'>{book.title}</p>

        {loadError ? <div className='alert alert-error mb-3 text-sm'>{loadError}</div> : null}

        {loading ? (
          <div className='mb-3 text-sm opacity-70'>{_('Loading wiki…')}</div>
        ) : (
          <>
            <label className='label'>
              <span className='label-text'>{_('Wiki page')}</span>
            </label>
            <input
              type='text'
              className='input input-bordered mb-2 w-full'
              placeholder={_('Search or type a new page title')}
              value={pageSearch}
              onChange={(e) => {
                setPageSearch(e.target.value);
                setSelectedPageId(null);
              }}
            />

            {filteredPages.length > 0 ? (
              <ul className='border-base-300 mb-2 max-h-36 overflow-y-auto rounded-md border'>
                {filteredPages.map((p) => (
                  <li key={p.id}>
                    <button
                      type='button'
                      className={clsx(
                        'hover:bg-base-200 w-full px-3 py-2 text-left text-sm',
                        selectedPageId === p.id && 'bg-base-200',
                      )}
                      onClick={() => handlePickPage(p)}
                    >
                      {p.title}
                      {p.isGhost ? (
                        <span className='text-base-content/50 ml-2 text-xs'>({_('draft')})</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {pageSearch.trim() && slugMatchPage ? (
              <p className='text-base-content/70 mb-2 text-xs'>
                {_(
                  'This title matches an existing page; your block will be added there. For a new page, change the title so it does not match an existing one.',
                )}
              </p>
            ) : null}

            {selectedPageId || slugMatchPage ? (
              <button
                type='button'
                className='btn btn-outline btn-sm mb-3 w-full'
                onClick={handleOpenInWiki}
              >
                {_('Open in wiki')}
              </button>
            ) : null}

            {showPageType ? (
              <label className='form-control mb-3 w-full'>
                <span className='label-text mb-1'>{_('Page type')}</span>
                <select
                  className='select select-bordered'
                  value={newPageType}
                  onChange={(e) => setNewPageType(e.target.value as WikiPageType)}
                >
                  {PAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className='label'>
              <span className='label-text'>{_('Section')}</span>
            </label>
            <select
              className='select select-bordered mb-2 w-full'
              value={sectionSelect}
              onChange={(e) => setSectionSelect(e.target.value)}
            >
              <option value=''>{_('None')}</option>
              {sectionCatalogEntries.map((e) => (
                <option key={e.id} value={e.name}>
                  {e.name}
                </option>
              ))}
            </select>
            <input
              type='text'
              className='input input-bordered mb-3 w-full'
              placeholder={_('New section name (optional)')}
              value={sectionNewInput}
              onChange={(e) => setSectionNewInput(e.target.value)}
            />

            <label className='label'>
              <span className='label-text'>{_('Note')}</span>
            </label>
            <TextEditor
              value={noteMarkdown}
              onChange={setNoteMarkdown}
              placeholder={_('Optional markdown note')}
              minRows={3}
              maxRows={12}
              className='textarea textarea-bordered mb-4 w-full font-mono text-sm leading-normal'
            />

            <div className='flex justify-end gap-2'>
              <button type='button' className='btn btn-ghost' onClick={handleDismiss}>
                {_('Cancel')}
              </button>
              <button
                type='button'
                className='btn btn-primary'
                disabled={!canSave || saving}
                onClick={() => void handleSave()}
              >
                {saving ? _('Saving…') : _('Save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LibraryWikiQuickNoteModal;
