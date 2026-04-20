import React from 'react';
import { LuBookOpen } from 'react-icons/lu';

import Button from '@/components/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { useEnv } from '@/context/EnvContext';
import { useReaderStore } from '@/store/readerStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useNotebookStore } from '@/store/notebookStore';
import { useWikiPanelStore } from '@/store/wikiPanelStore';

interface WikiPanelTogglerProps {
  bookKey: string;
}

const WikiPanelToggler: React.FC<WikiPanelTogglerProps> = ({ bookKey }) => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const { setHoveredBookKey } = useReaderStore();
  const { setSideBarBookKey } = useSidebarStore();
  const setNotebookVisible = useNotebookStore((s) => s.setNotebookVisible);
  const openWikiPanel = useWikiPanelStore((s) => s.open);
  const closeWikiPanel = useWikiPanelStore((s) => s.close);
  const isWikiPanelVisible = useWikiPanelStore((s) => s.isWikiPanelVisible);
  const wikiBookKey = useWikiPanelStore((s) => s.wikiBookKey);
  const iconSize16 = useResponsiveSize(16);

  const handleClick = () => {
    if (appService?.isMobile) {
      setHoveredBookKey('');
    }
    setSideBarBookKey(bookKey);
    if (isWikiPanelVisible && wikiBookKey === bookKey) {
      closeWikiPanel();
    } else {
      setNotebookVisible(false);
      openWikiPanel(bookKey);
    }
  };

  return (
    <Button
      icon={<LuBookOpen size={iconSize16} className='text-base-content' />}
      onClick={handleClick}
      label={_('Wiki')}
    />
  );
};

export default WikiPanelToggler;
