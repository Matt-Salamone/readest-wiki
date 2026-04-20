import React from 'react';
import { LuPlus } from 'react-icons/lu';

import Button from '@/components/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { useWikiCaptureStore } from '@/store/wikiCaptureStore';

interface WikiQuickCaptureTogglerProps {
  bookKey: string;
}

const WikiQuickCaptureToggler: React.FC<WikiQuickCaptureTogglerProps> = ({ bookKey }) => {
  const _ = useTranslation();
  const openQuickNote = useWikiCaptureStore((s) => s.openQuickNote);
  const iconSize16 = useResponsiveSize(16);

  return (
    <Button
      icon={<LuPlus size={iconSize16} className='text-base-content' />}
      onClick={() => openQuickNote(bookKey)}
      label={_('Wiki quick note')}
    />
  );
};

export default WikiQuickCaptureToggler;
