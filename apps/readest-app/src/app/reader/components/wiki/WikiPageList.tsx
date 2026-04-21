import clsx from 'clsx';
import React, { useMemo, useState } from 'react';

import { WikiStore, wikiTitleToSlug } from '@/services/wiki';
import type { WikiPage, WikiPageType } from '@/types/wiki';
import { useTranslation } from '@/hooks/useTranslation';
import { WIKI_PAGE_TYPES } from '@/app/reader/components/wiki/wikiPageTypes';

interface WikiPageListProps {
  namespaceId: string;
  pages: WikiPage[];
  activePageId: string | null;
  wiki: WikiStore;
  onSelectPage: (pageId: string) => void;
  onReload: () => Promise<void>;
  /** Global wiki index: page-type chips + sort. */
  showIndexToolbar?: boolean;
  pageTypeFilter?: WikiPageType | 'All';
  onPageTypeFilterChange?: (filter: WikiPageType | 'All') => void;
  sortMode?: 'alpha' | 'chronological';
  onSortModeChange?: (mode: 'alpha' | 'chronological') => void;
}

const WikiPageList: React.FC<WikiPageListProps> = ({
  namespaceId,
  pages,
  activePageId,
  wiki,
  onSelectPage,
  onReload,
  showIndexToolbar,
  pageTypeFilter = 'All',
  onPageTypeFilterChange,
  sortMode = 'alpha',
  onSortModeChange,
}) => {
  const _ = useTranslation();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...pages];
    if (pageTypeFilter !== 'All') {
      list = list.filter((p) => {
        const t = p.pageType ?? 'Misc';
        return t === pageTypeFilter;
      });
    }
    if (q) {
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortMode === 'chronological') {
        return a.createdAt - b.createdAt;
      }
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    });
    return list;
  }, [pages, search, pageTypeFilter, sortMode]);

  const handleNewPage = async () => {
    setCreating(true);
    try {
      const title = _('New page');
      for (let i = 0; i < 40; i++) {
        const candidate = i === 0 ? title : `${title} (${i})`;
        const slug = wikiTitleToSlug(candidate);
        const clash = await wiki.getPageByTitleSlug(namespaceId, slug);
        if (!clash) {
          const page = await wiki.createPage({
            namespaceId,
            title: candidate,
            pageType: 'Misc' as WikiPageType,
          });
          await onReload();
          onSelectPage(page.id);
          return;
        }
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className='border-base-300 flex min-h-0 w-[40%] min-w-[10rem] flex-col border-e'>
      <div className='flex-shrink-0 p-2'>
        {showIndexToolbar && onPageTypeFilterChange && onSortModeChange ? (
          <div className='mb-2 flex flex-col gap-2'>
            <div className='flex flex-wrap gap-1'>
              <button
                type='button'
                className={clsx(
                  'btn btn-xs',
                  pageTypeFilter === 'All' ? 'btn-primary' : 'btn-ghost',
                )}
                onClick={() => onPageTypeFilterChange('All')}
              >
                {_('All')}
              </button>
              {WIKI_PAGE_TYPES.map((t) => (
                <button
                  key={t}
                  type='button'
                  title={t}
                  className={clsx(
                    'btn btn-xs min-w-0 px-1.5',
                    pageTypeFilter === t && 'btn-primary',
                  )}
                  onClick={() => onPageTypeFilterChange(t)}
                >
                  <span className='sr-only'>{t}</span>
                  <span className='text-[10px] font-semibold' aria-hidden>
                    {t.slice(0, 2)}
                  </span>
                </button>
              ))}
            </div>
            <div className='join w-full'>
              <button
                type='button'
                className={clsx(
                  'btn join-item btn-xs flex-1',
                  sortMode === 'alpha' && 'btn-active',
                )}
                onClick={() => onSortModeChange('alpha')}
              >
                {_('A–Z')}
              </button>
              <button
                type='button'
                className={clsx(
                  'btn join-item btn-xs flex-1',
                  sortMode === 'chronological' && 'btn-active',
                )}
                onClick={() => onSortModeChange('chronological')}
              >
                {_('Chronological')}
              </button>
            </div>
          </div>
        ) : null}
        <input
          type='search'
          className='input input-bordered input-sm mb-2 w-full'
          placeholder={_('Search wiki pages')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={_('Search wiki pages')}
        />
        <button
          type='button'
          className='btn btn-secondary btn-sm w-full'
          disabled={creating}
          onClick={() => void handleNewPage()}
        >
          {creating ? _('Creating…') : _('New page')}
        </button>
      </div>
      <ul className='min-h-0 flex-1 overflow-y-auto px-1 pb-2' role='listbox'>
        {filtered.map((p) => (
          <li key={p.id}>
            <button
              type='button'
              role='option'
              aria-selected={activePageId === p.id}
              className={clsx(
                'hover:bg-base-200 mb-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm',
                activePageId === p.id && 'bg-base-300',
              )}
              onClick={() => onSelectPage(p.id)}
            >
              <span className='line-clamp-2 break-words'>{p.title}</span>
              <span className='text-base-content/60 mt-0.5 block text-xs'>
                {p.pageType ?? ''}
                {p.isGhost ? (
                  <span className='text-base-content/50 ml-1'>({_('draft')})</span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className='text-base-content/60 px-2 py-4 text-center text-sm'>
            {_('No pages yet')}
          </li>
        ) : null}
      </ul>
    </div>
  );
};

export default WikiPageList;
