import clsx from 'clsx';
import React from 'react';
import { LuBookOpen } from 'react-icons/lu';
import { MdArrowBackIosNew, MdOutlinePushPin, MdPushPin } from 'react-icons/md';

import type { WikiStore } from '@/services/wiki';
import type { WikiNamespace } from '@/types/wiki';
import type { SpoilerOverride } from '@/types/wiki';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';

import WikiPortabilityActions from '@/app/reader/components/wiki/WikiPortabilityActions';

const WikiPanelHeader: React.FC<{
  isPinned: boolean;
  handleClose: () => void;
  handleTogglePin: () => void;
  namespace?: WikiNamespace | null;
  wiki?: WikiStore | null;
  onReloadWiki?: () => Promise<void>;
}> = ({ isPinned, handleClose, handleTogglePin, namespace, wiki, onReloadWiki }) => {
  const _ = useTranslation();
  const iconSize14 = useResponsiveSize(14);
  const iconSize18 = useResponsiveSize(18);

  const spoilerSelectValue =
    namespace?.spoilerOverride === 'on' || namespace?.spoilerOverride === 'off'
      ? namespace.spoilerOverride
      : 'auto';

  const handleSpoilerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!wiki || !namespace || !onReloadWiki) return;
    const v = e.target.value;
    const next: SpoilerOverride = v === 'auto' ? null : v === 'on' ? 'on' : 'off';
    await wiki.setNamespaceSpoilerOverride(namespace.id, next);
    await onReloadWiki();
  };

  return (
    <div className='relative flex h-11 items-center px-2 sm:px-3' dir='ltr'>
      <div className='absolute inset-0 z-[-1] flex items-center justify-center space-x-2'>
        <LuBookOpen size={iconSize18} />
        <div className='hidden text-sm font-medium sm:flex'>{_('Wiki')}</div>
      </div>
      <div className='flex w-full min-w-0 items-center gap-x-1 sm:gap-x-2'>
        <button
          title={isPinned ? _('Unpin Wiki') : _('Pin Wiki')}
          type='button'
          onClick={handleTogglePin}
          className={clsx(
            'btn btn-ghost btn-circle hidden h-6 min-h-6 w-6 shrink-0 sm:flex',
            isPinned ? 'bg-base-300' : 'bg-base-300/65',
          )}
        >
          {isPinned ? <MdPushPin size={iconSize14} /> : <MdOutlinePushPin size={iconSize14} />}
        </button>
        {namespace && wiki && onReloadWiki ? (
          <>
            <select
              className='select select-bordered select-xs max-w-[5.5rem] shrink text-[10px] sm:max-w-[7rem] sm:text-xs'
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
              namespaceId={namespace.id}
              namespaceTitle={namespace.title}
              allowMergeImport
              onAfterImport={onReloadWiki}
            />
          </>
        ) : null}
        <div className='flex-1' />
        <button
          title={_('Close')}
          type='button'
          onClick={handleClose}
          className='btn btn-ghost btn-circle flex h-6 min-h-6 w-6 shrink-0 hover:bg-transparent sm:hidden'
        >
          <MdArrowBackIosNew />
        </button>
      </div>
    </div>
  );
};

export default WikiPanelHeader;
