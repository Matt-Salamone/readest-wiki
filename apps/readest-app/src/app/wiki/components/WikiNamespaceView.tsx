'use client';

import React, { useCallback, useMemo, useState } from 'react';

import WikiPageList from '@/app/reader/components/wiki/WikiPageList';
import WikiPortabilityActions from '@/app/reader/components/wiki/WikiPortabilityActions';
import { buildWikiSpoilerContext } from '@/app/reader/utils/wikiSpoiler';
import { useTranslation } from '@/hooks/useTranslation';
import WikiPageView from '@/app/wiki/components/WikiPageView';
import { WikiStore } from '@/services/wiki';
import type { SpoilerOverride, WikiPageType } from '@/types/wiki';
import { useLibraryStore } from '@/store/libraryStore';
import { useWikiStore } from '@/store/wikiStore';

interface WikiNamespaceViewProps {
  namespaceId: string;
  activePageId: string | null;
  wiki: WikiStore;
  onSelectPage: (pageId: string | null) => void;
}

const WikiNamespaceView: React.FC<WikiNamespaceViewProps> = ({
  namespaceId,
  activePageId,
  wiki,
  onSelectPage,
}) => {
  const _ = useTranslation();
  const loadNamespaceById = useWikiStore((s) => s.loadNamespaceById);
  const loadAllNamespaces = useWikiStore((s) => s.loadAllNamespaces);
  const caches = useWikiStore((s) => s.caches);
  const library = useLibraryStore((s) => s.library);

  const [pageTypeFilter, setPageTypeFilter] = useState<WikiPageType | 'All'>('All');
  const [sortMode, setSortMode] = useState<'alpha' | 'chronological'>('alpha');

  const cache = caches[namespaceId];

  const spoilerCtx = useMemo(() => {
    if (!cache?.namespace) return null;
    return buildWikiSpoilerContext(cache.namespace, library, {
      activeBookKey: null,
      activeBook: undefined,
      activeLocation: null,
    });
  }, [cache?.namespace, library]);

  const spoilerSelectValue =
    cache?.namespace.spoilerOverride === 'on' || cache?.namespace.spoilerOverride === 'off'
      ? cache.namespace.spoilerOverride
      : 'auto';

  const handleSpoilerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!cache || !wiki) return;
    const v = e.target.value;
    const next: SpoilerOverride = v === 'auto' ? null : v === 'on' ? 'on' : 'off';
    await wiki.setNamespaceSpoilerOverride(cache.namespace.id, next);
    await loadNamespaceById(wiki, cache.namespace.id);
  };

  const handleAfterWikiImport = async () => {
    await loadAllNamespaces(wiki);
    await loadNamespaceById(wiki, namespaceId);
  };

  const reloadWiki = useCallback(async () => {
    await loadNamespaceById(wiki, namespaceId);
  }, [wiki, namespaceId, loadNamespaceById]);

  if (!cache) {
    return (
      <div className='text-base-content/70 flex flex-1 items-center justify-center p-6 text-sm'>
        {_('Loading wiki…')}
      </div>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='border-base-300 flex flex-shrink-0 flex-wrap items-center gap-2 border-b px-2 py-1'>
        <select
          className='select select-bordered select-xs max-w-[8rem] text-xs'
          aria-label={_('Re-read mode')}
          title={_('Re-read mode')}
          value={spoilerSelectValue}
          onChange={(e) => void handleSpoilerChange(e)}
        >
          <option value='auto'>{_('Auto')}</option>
          <option value='on'>{_('Spoilers on')}</option>
          <option value='off'>{_('Spoilers off')}</option>
        </select>
        <WikiPortabilityActions
          wiki={wiki}
          namespaceId={cache.namespace.id}
          namespaceTitle={cache.namespace.title}
          allowMergeImport
          onAfterImport={handleAfterWikiImport}
        />
      </div>
      <div className='flex min-h-0 flex-1 flex-row overflow-hidden'>
        <WikiPageList
          namespaceId={cache.namespace.id}
          pages={Object.values(cache.pages)}
          activePageId={activePageId}
          wiki={wiki}
          onSelectPage={(id) => onSelectPage(id)}
          onReload={reloadWiki}
          showIndexToolbar
          pageTypeFilter={pageTypeFilter}
          onPageTypeFilterChange={setPageTypeFilter}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          spoilerCtx={spoilerCtx}
        />
        <WikiPageView
          namespaceId={cache.namespace.id}
          pageId={activePageId}
          wiki={wiki}
          pages={cache.pages}
          blocks={activePageId ? (cache.blocksByPage[activePageId] ?? []) : []}
          tagsById={cache.tags}
          onReload={reloadWiki}
          onSelectPage={onSelectPage}
          spoilerCtx={spoilerCtx}
        />
      </div>
    </div>
  );
};

export default WikiNamespaceView;
