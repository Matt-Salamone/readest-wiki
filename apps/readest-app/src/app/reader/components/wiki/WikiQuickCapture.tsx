import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useEnv } from '@/context/EnvContext';
import TextEditor from '@/components/TextEditor';
import { WikiStore, wikiTitleToSlug } from '@/services/wiki';
import { useBookDataStore } from '@/store/bookDataStore';
import { useWikiStore } from '@/store/wikiStore';
import { useWikiCaptureStore } from '@/store/wikiCaptureStore';
import type { WikiPage, WikiPageType, WikiSectionCatalogEntry } from '@/types/wiki';
import { useAddToWiki } from '@/app/reader/hooks/useAddToWiki';
import { useTranslation } from '@/hooks/useTranslation';

const PAGE_TYPES: WikiPageType[] = [
  'Person',
  'Location',
  'Faction',
  'Item',
  'Concept',
  'Lore',
  'Misc',
];

interface WikiQuickCaptureProps {
  bookKey: string;
}

const WikiQuickCapture: React.FC<WikiQuickCaptureProps> = ({ bookKey }) => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const getBookData = useBookDataStore((s) => s.getBookData);
  const loadNamespace = useWikiStore((s) => s.loadNamespace);
  const activeNamespaceId = useWikiStore((s) => s.activeNamespaceId);
  const caches = useWikiStore((s) => s.caches);

  const isOpen = useWikiCaptureStore((s) => s.isOpen);
  const storeBookKey = useWikiCaptureStore((s) => s.bookKey);
  const cfi = useWikiCaptureStore((s) => s.cfi);
  const quoteText = useWikiCaptureStore((s) => s.quoteText);
  const closeCapture = useWikiCaptureStore((s) => s.close);

  const { addToWiki } = useAddToWiki(bookKey);

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

  const visible = isOpen && storeBookKey === bookKey;

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
    if (!visible) {
      resetForm();
      return;
    }

    let cancelled = false;
    const run = async () => {
      const book = getBookData(bookKey)?.book;
      if (!book || !appService) {
        setLoadError(_('Book not loaded'));
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const wiki = new WikiStore(appService);
        await loadNamespace(wiki, book);
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
  }, [visible, bookKey, getBookData, appService, loadNamespace, _]);

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
    const book = getBookData(bookKey)?.book;
    if (!book) return;

    const titleTrim = pageSearch.trim();
    if (!titleTrim && !selectedPageId) {
      return;
    }

    let target:
      | { kind: 'existing'; pageId: string }
      | { kind: 'new'; title: string; pageType: WikiPageType | null };

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
      await addToWiki({
        targetPage:
          target.kind === 'existing'
            ? target
            : {
                kind: 'new',
                title: target.title,
                pageType: target.pageType,
              },
        cfi,
        quoteText,
        noteMarkdown: noteMarkdown.trim() ? noteMarkdown : null,
        tagName: sectionTag,
      });
      closeCapture();
      resetForm();
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    closeCapture();
    resetForm();
  };

  const titleTrim = pageSearch.trim();
  const canSave = Boolean(selectedPageId) || Boolean(titleTrim);

  const showPageType = Boolean(titleTrim) && !selectedPageId && !slugMatchPage;

  if (!visible) return null;

  return (
    <div
      className='fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4'
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
        aria-labelledby='wiki-quick-capture-title'
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id='wiki-quick-capture-title' className='mb-3 text-lg font-semibold'>
          {_('Add to Wiki')}
        </h2>

        {quoteText ? (
          <div className='bg-base-200 mb-3 rounded-md p-2'>
            <div className='text-base-content/70 mb-1 text-xs font-medium uppercase'>
              {_('Quote')}
            </div>
            <blockquote className='text-sm leading-relaxed'>{quoteText}</blockquote>
          </div>
        ) : null}

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
              <p className='text-base-content/70 mb-3 text-xs'>
                {_(
                  'This title matches an existing page; your block will be added there. For a new page, change the title so it does not match an existing one.',
                )}
              </p>
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
            <p className='text-base-content/70 mb-2 text-xs'>
              {_(
                'Optional. Pick a shared section heading for this block. The same catalog is used for every wiki.',
              )}
            </p>
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
            <label className='label'>
              <span className='label-text'>{_('New section')}</span>
            </label>
            <p className='text-base-content/70 mb-2 text-xs'>
              {_(
                'Type a new name to save it to the shared list. If filled, this overrides the menu above.',
              )}
            </p>
            <input
              type='text'
              className='input input-bordered mb-3 w-full'
              placeholder={_('Custom section name')}
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

export default WikiQuickCapture;
