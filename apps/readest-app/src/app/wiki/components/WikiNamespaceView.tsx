'use client';

import React, { useCallback, useState } from 'react';

import WikiPageList from '@/app/reader/components/wiki/WikiPageList';
import { useTranslation } from '@/hooks/useTranslation';
import WikiPageView from '@/app/wiki/components/WikiPageView';
import { WikiStore } from '@/services/wiki';
import type { WikiPageType } from '@/types/wiki';
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
  const invalidateNamespace = useWikiStore((s) => s.invalidateNamespace);
  const caches = useWikiStore((s) => s.caches);

  const [pageTypeFilter, setPageTypeFilter] = useState<WikiPageType | 'All'>('All');
  const [sortMode, setSortMode] = useState<'alpha' | 'chronological'>('alpha');

  const cache = caches[namespaceId];

  const reloadWiki = useCallback(async () => {
    invalidateNamespace(namespaceId);
    await loadNamespaceById(wiki, namespaceId);
  }, [wiki, namespaceId, invalidateNamespace, loadNamespaceById]);

  if (!cache) {
    return (
      <div className='text-base-content/70 flex flex-1 items-center justify-center p-6 text-sm'>
        {_('Loading wiki…')}
      </div>
    );
  }

  return (
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
      />
    </div>
  );
};

export default WikiNamespaceView;
