import clsx from 'clsx';
import React from 'react';
import { LuBookOpen } from 'react-icons/lu';
import { MdArrowBackIosNew, MdOutlinePushPin, MdPushPin } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';

const WikiPanelHeader: React.FC<{
  isPinned: boolean;
  handleClose: () => void;
  handleTogglePin: () => void;
}> = ({ isPinned, handleClose, handleTogglePin }) => {
  const _ = useTranslation();
  const iconSize14 = useResponsiveSize(14);
  const iconSize18 = useResponsiveSize(18);

  return (
    <div className='relative flex h-11 items-center px-3' dir='ltr'>
      <div className='absolute inset-0 z-[-1] flex items-center justify-center space-x-2'>
        <LuBookOpen size={iconSize18} />
        <div className='hidden text-sm font-medium sm:flex'>{_('Wiki')}</div>
      </div>
      <div className='flex w-full items-center gap-x-4'>
        <button
          title={isPinned ? _('Unpin Wiki') : _('Pin Wiki')}
          type='button'
          onClick={handleTogglePin}
          className={clsx(
            'btn btn-ghost btn-circle hidden h-6 min-h-6 w-6 sm:flex',
            isPinned ? 'bg-base-300' : 'bg-base-300/65',
          )}
        >
          {isPinned ? <MdPushPin size={iconSize14} /> : <MdOutlinePushPin size={iconSize14} />}
        </button>
        <button
          title={_('Close')}
          type='button'
          onClick={handleClose}
          className='btn btn-ghost btn-circle flex h-6 min-h-6 w-6 hover:bg-transparent sm:hidden'
        >
          <MdArrowBackIosNew />
        </button>
      </div>
    </div>
  );
};

export default WikiPanelHeader;
