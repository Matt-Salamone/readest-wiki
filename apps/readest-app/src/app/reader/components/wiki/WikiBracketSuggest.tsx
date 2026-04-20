import clsx from 'clsx';
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export interface WikiBracketSuggestItem {
  id: string;
  title: string;
  isGhost?: boolean;
}

interface WikiBracketSuggestProps {
  open: boolean;
  top: number;
  left: number;
  items: WikiBracketSuggestItem[];
  onPick: (title: string) => void;
}

/**
 * Floating list for `[[...` wiki link completion (fixed positioning).
 */
const WikiBracketSuggest: React.FC<WikiBracketSuggestProps> = ({
  open,
  top,
  left,
  items,
  onPick,
}) => {
  const _ = useTranslation();
  if (!open || items.length === 0) return null;

  return (
    <ul
      className={clsx(
        'border-base-300 bg-base-100 fixed z-[80] max-h-48 min-w-[12rem] overflow-y-auto rounded-md border py-1 shadow-lg',
      )}
      style={{ top, left }}
      role='listbox'
    >
      {items.map((item) => (
        <li key={item.id} role='option'>
          <button
            type='button'
            className='hover:bg-base-200 w-full px-3 py-1.5 text-left text-sm'
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(item.title);
            }}
          >
            <span className={clsx(item.isGhost && 'text-base-content/60')}>{item.title}</span>
            {item.isGhost ? (
              <span className='text-base-content/50 ml-2 text-xs'>({_('draft')})</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default WikiBracketSuggest;
