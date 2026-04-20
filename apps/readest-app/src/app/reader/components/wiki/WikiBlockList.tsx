import clsx from 'clsx';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import TextEditor from '@/components/TextEditor';
import type { TextEditorRef } from '@/components/TextEditor';
import { WikiStore } from '@/services/wiki';
import type { WikiBlock, WikiPage, WikiTag } from '@/types/wiki';
import { useTranslation } from '@/hooks/useTranslation';
import { useReaderStore } from '@/store/readerStore';
import { useLibraryStore } from '@/store/libraryStore';
import {
  acceptWikiBracketTitle,
  getWikiBracketSuggestContext,
} from '@/app/reader/hooks/useWikiLinkSuggest';
import { getTextareaCaretOffset } from '@/utils/textareaCaret';
import WikiMarkdown from './WikiMarkdown';
import WikiBracketSuggest from './WikiBracketSuggest';

interface WikiBlockListProps {
  bookKey: string;
  pageId: string;
  namespaceId: string;
  blocks: WikiBlock[];
  tagsById: Record<string, WikiTag>;
  pagesBySlug: Map<string, WikiPage>;
  pagesList: WikiPage[];
  wiki: WikiStore;
  hideAllQuotes: boolean;
  onHideAllQuotesChange: (hide: boolean) => void;
  onReload: () => Promise<void>;
  onNavigateToPage: (pageId: string) => void;
}

const WikiBlockList: React.FC<WikiBlockListProps> = ({
  bookKey,
  pageId,
  namespaceId,
  blocks,
  tagsById,
  pagesBySlug,
  pagesList,
  wiki,
  hideAllQuotes,
  onHideAllQuotesChange,
  onReload,
  onNavigateToPage,
}) => {
  const _ = useTranslation();
  const getView = useReaderStore((s) => s.getView);
  const getBookByHash = useLibraryStore((s) => s.getBookByHash);

  const [noteModeByBlock, setNoteModeByBlock] = useState<Record<string, 'view' | 'edit'>>({});
  const [noteDraftByBlock, setNoteDraftByBlock] = useState<Record<string, string>>({});
  const [quoteExpanded, setQuoteExpanded] = useState<Record<string, boolean>>({});
  const [caretByBlock, setCaretByBlock] = useState<Record<string, number>>({});

  const editorRefs = useRef<Record<string, TextEditorRef | null>>({});

  const grouped = useMemo(() => {
    const ungroupedLabel = _('Ungrouped');
    const map = new Map<string, WikiBlock[]>();
    for (const b of blocks) {
      let section = ungroupedLabel;
      const tid = b.tagIds[0];
      if (tid && tagsById[tid]) {
        section = tagsById[tid].tagName;
      }
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(b);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === ungroupedLabel) return 1;
      if (b === ungroupedLabel) return -1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    return keys.map((k) => ({ section: k, blocks: map.get(k)! }));
  }, [blocks, tagsById, _]);

  const suggestItems = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      const list = !q ? pagesList : pagesList.filter((p) => p.title.toLowerCase().includes(q));
      return list.slice(0, 12).map((p) => ({
        id: p.id,
        title: p.title,
        isGhost: p.isGhost === 1,
      }));
    },
    [pagesList],
  );

  const saveBlockNote = async (blockId: string, markdown: string | null) => {
    await wiki.updateBlock(blockId, { noteMarkdown: markdown });
    await wiki.upsertWikiLinks(pageId, blockId, markdown ?? '', namespaceId);
    await onReload();
  };

  const handleJump = (cfi: string) => {
    if (!cfi?.trim()) return;
    getView(bookKey)?.goTo(cfi.trim());
  };

  const renderBlock = (block: WikiBlock) => {
    const mode = noteModeByBlock[block.id] ?? 'view';
    const draft = noteDraftByBlock[block.id] ?? block.noteMarkdown ?? '';
    const ctx = getWikiBracketSuggestContext(draft, caretByBlock[block.id] ?? draft.length);
    const suggestOpen = Boolean(mode === 'edit' && ctx?.active);
    const items = suggestOpen ? suggestItems(ctx!.query) : [];

    let suggestPos = { top: 0, left: 0 };
    if (suggestOpen && editorRefs.current[block.id]?.getElement()) {
      const el = editorRefs.current[block.id]!.getElement()!;
      const caret = caretByBlock[block.id] ?? draft.length;
      const coords = getTextareaCaretOffset(el, caret);
      suggestPos = { top: coords.top + 4, left: coords.left };
    }

    const expanded = quoteExpanded[block.id] ?? false;
    const showQuote = Boolean(block.quoteText) && !hideAllQuotes;

    const bookTitle = getBookByHash(block.bookHash)?.title ?? block.bookHash.slice(0, 8);

    return (
      <div key={block.id} className='border-base-300 bg-base-100 mb-3 rounded-lg border p-2'>
        <div className='mb-2 flex flex-wrap items-center gap-2 text-xs'>
          <span className='badge badge-outline badge-sm max-w-[10rem] truncate' title={bookTitle}>
            {bookTitle}
          </span>
          <button
            type='button'
            className='btn btn-ghost btn-xs'
            disabled={!block.cfi?.trim()}
            onClick={() => handleJump(block.cfi)}
          >
            {_('Jump')}
          </button>
        </div>

        {showQuote ? (
          <div className='mb-2'>
            <button
              type='button'
              className='text-base-content/70 mb-1 text-xs underline'
              onClick={() => setQuoteExpanded((s) => ({ ...s, [block.id]: !expanded }))}
            >
              {expanded ? _('Hide quote') : _('Show quote')}
            </button>
            {expanded ? (
              <blockquote className='border-base-content/20 text-sm italic opacity-90'>
                {block.quoteText}
              </blockquote>
            ) : null}
          </div>
        ) : null}

        <div className='mb-1 flex items-center gap-2'>
          <span className='text-xs font-medium'>{_('Note')}</span>
          <div className='join'>
            <button
              type='button'
              className={clsx('btn join-item btn-xs', mode === 'view' && 'btn-active')}
              onClick={async () => {
                if (mode === 'edit') {
                  await saveBlockNote(block.id, draft.trim() ? draft : null);
                }
                setNoteModeByBlock((s) => ({ ...s, [block.id]: 'view' }));
              }}
            >
              {_('View')}
            </button>
            <button
              type='button'
              className={clsx('btn join-item btn-xs', mode === 'edit' && 'btn-active')}
              onClick={() => {
                setNoteDraftByBlock((s) => ({
                  ...s,
                  [block.id]: block.noteMarkdown ?? '',
                }));
                setNoteModeByBlock((s) => ({ ...s, [block.id]: 'edit' }));
              }}
            >
              {_('Edit')}
            </button>
          </div>
          <button
            type='button'
            className='btn btn-ghost btn-xs text-error'
            onClick={async () => {
              if (window.confirm(_('Delete this wiki block?'))) {
                await wiki.softDeleteBlock(block.id);
                await onReload();
              }
            }}
          >
            {_('Delete')}
          </button>
        </div>

        {mode === 'view' ? (
          <WikiMarkdown
            markdown={block.noteMarkdown ?? ''}
            pagesBySlug={pagesBySlug}
            onWikiPageNavigate={onNavigateToPage}
            className='text-sm'
          />
        ) : (
          <div className='relative'>
            <TextEditor
              ref={(r) => {
                editorRefs.current[block.id] = r;
              }}
              value={draft}
              onChange={(v) => setNoteDraftByBlock((s) => ({ ...s, [block.id]: v }))}
              onCaretChange={(caret) => setCaretByBlock((s) => ({ ...s, [block.id]: caret }))}
              minRows={3}
              maxRows={14}
              className='textarea textarea-bordered w-full font-mono text-sm'
              onSave={async () => {
                await saveBlockNote(block.id, draft.trim() ? draft : null);
                setNoteModeByBlock((s) => ({ ...s, [block.id]: 'view' }));
              }}
            />
            <WikiBracketSuggest
              open={suggestOpen && items.length > 0}
              top={suggestPos.top}
              left={suggestPos.left}
              items={items}
              onPick={(title) => {
                const c = getWikiBracketSuggestContext(
                  draft,
                  caretByBlock[block.id] ?? draft.length,
                );
                if (!c?.active) return;
                const { nextValue, nextCaret } = acceptWikiBracketTitle(
                  draft,
                  caretByBlock[block.id] ?? draft.length,
                  c,
                  title,
                );
                setNoteDraftByBlock((s) => ({ ...s, [block.id]: nextValue }));
                setCaretByBlock((s) => ({ ...s, [block.id]: nextCaret }));
                requestAnimationFrame(() => {
                  const el = editorRefs.current[block.id]?.getElement();
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
    );
  };

  return (
    <div className='mt-4'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold'>{_('Blocks')}</h3>
        <label className='label cursor-pointer gap-2 py-0'>
          <span className='label-text text-xs'>{_('Hide quotes')}</span>
          <input
            type='checkbox'
            className='toggle toggle-sm'
            checked={hideAllQuotes}
            onChange={(e) => onHideAllQuotesChange(e.target.checked)}
          />
        </label>
      </div>

      {blocks.length === 0 ? (
        <p className='text-base-content/60 text-sm'>{_('No blocks on this page yet.')}</p>
      ) : null}

      {grouped.map(({ section, blocks: secBlocks }) => (
        <div key={section} className='mb-4'>
          <h4 className='text-base-content/80 mb-2 text-xs font-bold uppercase tracking-wide'>
            {section}
          </h4>
          {secBlocks.map(renderBlock)}
        </div>
      ))}
    </div>
  );
};

export default WikiBlockList;
