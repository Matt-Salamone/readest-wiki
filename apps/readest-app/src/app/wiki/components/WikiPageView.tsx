'use client';

import React from 'react';

import WikiPageEditor from '@/app/reader/components/wiki/WikiPageEditor';
import WikiBacklinks from '@/app/wiki/components/WikiBacklinks';
import { WikiStore } from '@/services/wiki';
import type { WikiBlock, WikiPage, WikiTag } from '@/types/wiki';

interface WikiPageViewProps {
  namespaceId: string;
  pageId: string | null;
  wiki: WikiStore;
  pages: Record<string, WikiPage>;
  blocks: WikiBlock[];
  tagsById: Record<string, WikiTag>;
  onReload: () => Promise<void>;
  onSelectPage: (pageId: string | null) => void;
}

const WikiPageView: React.FC<WikiPageViewProps> = ({
  namespaceId,
  pageId,
  wiki,
  pages,
  blocks,
  tagsById,
  onReload,
  onSelectPage,
}) => {
  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
      <WikiPageEditor
        bookKey={null}
        pageId={pageId}
        namespaceId={namespaceId}
        wiki={wiki}
        pages={pages}
        blocks={blocks}
        tagsById={tagsById}
        onReload={onReload}
        onSelectPage={onSelectPage}
      />
      {pageId ? (
        <WikiBacklinks wiki={wiki} targetPageId={pageId} onOpenSourcePage={onSelectPage} />
      ) : null}
    </div>
  );
};

export default WikiPageView;
