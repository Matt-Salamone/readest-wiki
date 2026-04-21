'use client';

import React, { useEffect, useState } from 'react';

import type { WikiBlock, WikiLink, WikiPage } from '@/types/wiki';
import { WikiStore } from '@/services/wiki';
import { useTranslation } from '@/hooks/useTranslation';

export interface WikiBacklinkRow {
  link: WikiLink;
  sourcePage: WikiPage;
  sourceBlock: WikiBlock | null;
}

interface WikiBacklinksProps {
  wiki: WikiStore;
  targetPageId: string;
  onOpenSourcePage: (sourcePageId: string) => void;
}

const WikiBacklinks: React.FC<WikiBacklinksProps> = ({ wiki, targetPageId, onOpenSourcePage }) => {
  const _ = useTranslation();
  const [rows, setRows] = useState<WikiBacklinkRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await wiki.listBacklinks(targetPageId);
      if (!cancelled) setRows(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [wiki, targetPageId]);

  if (rows.length === 0) {
    return (
      <div className='border-base-300 mt-4 rounded-lg border p-3'>
        <h3 className='mb-2 text-sm font-semibold'>{_('Backlinks')}</h3>
        <p className='text-base-content/60 text-xs'>{_('No other pages link here yet.')}</p>
      </div>
    );
  }

  const grouped = new Map<string, WikiBacklinkRow[]>();
  for (const r of rows) {
    const id = r.sourcePage.id;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id)!.push(r);
  }

  return (
    <div className='border-base-300 mt-4 rounded-lg border p-3'>
      <h3 className='mb-2 text-sm font-semibold'>{_('Backlinks')}</h3>
      <ul className='space-y-2'>
        {[...grouped.entries()].map(([sourcePageId, items]) => {
          const title = items[0]!.sourcePage.title;
          return (
            <li key={sourcePageId}>
              <button
                type='button'
                className='link link-primary text-left text-sm font-medium'
                onClick={() => onOpenSourcePage(sourcePageId)}
              >
                {title}
              </button>
              <ul className='text-base-content/70 ms-2 mt-1 list-inside list-disc text-xs'>
                {items.map((item) => (
                  <li key={`${item.link.sourcePageId}-${item.link.sourceBlockId ?? 'summary'}`}>
                    {item.sourceBlock ? _('In block note') : _('In summary')}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WikiBacklinks;
