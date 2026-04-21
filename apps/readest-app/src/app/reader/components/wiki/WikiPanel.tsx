'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Overlay } from '@/components/Overlay';
import { saveSysSettings } from '@/helpers/settings';
import useShortcuts from '@/hooks/useShortcuts';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { usePanelResize } from '@/hooks/usePanelResize';
import { useTranslation } from '@/hooks/useTranslation';
import { WikiStore } from '@/services/wiki';
import { eventDispatcher } from '@/utils/event';
import { useEnv } from '@/context/EnvContext';
import { useBookDataStore } from '@/store/bookDataStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore } from '@/store/themeStore';
import { useWikiPanelStore } from '@/store/wikiPanelStore';
import { useWikiStore } from '@/store/wikiStore';

import { buildWikiSpoilerContext } from '@/app/reader/utils/wikiSpoiler';

import WikiPanelHeader from './WikiPanelHeader';
import WikiPageEditor from './WikiPageEditor';
import WikiPageList from './WikiPageList';

const MIN_WIKI_WIDTH = 0.15;
const MAX_WIKI_WIDTH = 0.45;

const WikiPanel: React.FC = () => {
  const _ = useTranslation();
  const { envConfig, appService } = useEnv();

  const isWikiPanelVisible = useWikiPanelStore((s) => s.isWikiPanelVisible);
  const wikiBookKey = useWikiPanelStore((s) => s.wikiBookKey);
  const wikiPanelWidth = useWikiPanelStore((s) => s.wikiPanelWidth);
  const isWikiPanelPinned = useWikiPanelStore((s) => s.isWikiPanelPinned);
  const activePageId = useWikiPanelStore((s) => s.activePageId);

  const closeWikiPanel = useWikiPanelStore((s) => s.close);
  const setWikiPanelPinned = useWikiPanelStore((s) => s.setWikiPanelPinned);
  const setWikiPanelWidthStore = useWikiPanelStore((s) => s.setWikiPanelWidth);
  const setActivePageId = useWikiPanelStore((s) => s.setActivePageId);

  const { settings } = useSettingsStore();

  const wiki = useMemo(() => (appService ? new WikiStore(appService) : null), [appService]);

  const getBookData = useBookDataStore((s) => s.getBookData);
  const loadNamespace = useWikiStore((s) => s.loadNamespace);
  const caches = useWikiStore((s) => s.caches);
  const activeNamespaceId = useWikiStore((s) => s.activeNamespaceId);

  const getViewSettings = useReaderStore((s) => s.getViewSettings);
  const library = useLibraryStore((s) => s.library);
  const progressLocation = useReaderStore((s) =>
    wikiBookKey ? (s.viewStates[wikiBookKey]?.progress?.location ?? null) : null,
  );

  const { safeAreaInsets, systemUIVisible, statusBarHeight, updateAppTheme } = useThemeStore();

  const book = wikiBookKey ? getBookData(wikiBookKey)?.book : undefined;
  const viewSettings = wikiBookKey ? getViewSettings(wikiBookKey) : undefined;

  const cache = activeNamespaceId ? caches[activeNamespaceId] : undefined;

  const spoilerCtx = useMemo(() => {
    if (!cache?.namespace || !book) return null;
    return buildWikiSpoilerContext(cache.namespace, library, {
      activeBookKey: wikiBookKey,
      activeBook: book,
      activeLocation: progressLocation,
    });
  }, [cache?.namespace, library, wikiBookKey, book, progressLocation]);

  const [isFullHeightInMobile, setIsFullHeightInMobile] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const {
    panelRef: wikiPanelRef,
    overlayRef,
    panelHeight: wikiPanelHeight,
    handleVerticalDragStart,
  } = useSwipeToDismiss(
    () => closeWikiPanel(),
    (data) => setIsFullHeightInMobile(data.clientY < 44),
  );

  useEffect(() => {
    const gr = settings.globalReadSettings;
    setWikiPanelWidthStore(gr.wikiPanelWidth ?? '25%');
    setWikiPanelPinned(gr.isWikiPanelPinned ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!wiki || !book || !isWikiPanelVisible) return;
    void loadNamespace(wiki, book);
  }, [wiki, book, isWikiPanelVisible, loadNamespace]);

  const reloadWiki = useCallback(async () => {
    if (!wiki || !book) return;
    await loadNamespace(wiki, book);
  }, [wiki, book, loadNamespace]);

  const handleWikiResize = useCallback(
    (newWidth: string) => {
      setWikiPanelWidthStore(newWidth);
      const { settings: latest } = useSettingsStore.getState();
      const globalReadSettings = {
        ...latest.globalReadSettings,
        wikiPanelWidth: newWidth,
      };
      void saveSysSettings(envConfig, 'globalReadSettings', globalReadSettings);
    },
    [envConfig, setWikiPanelWidthStore],
  );

  const { handleResizeStart: handleDragStart, handleResizeKeyDown: handleResizeKeyDown } =
    usePanelResize({
      side: 'end',
      minWidth: MIN_WIKI_WIDTH,
      maxWidth: MAX_WIKI_WIDTH,
      getWidth: () => wikiPanelWidth,
      onResize: handleWikiResize,
    });

  const handleTogglePin = () => {
    const next = !isWikiPanelPinned;
    setWikiPanelPinned(next);
    const latest = useSettingsStore.getState().settings;
    const globalReadSettings = {
      ...latest.globalReadSettings,
      isWikiPanelPinned: next,
    };
    void saveSysSettings(envConfig, 'globalReadSettings', globalReadSettings);
  };

  const handleHideWiki = useCallback(() => {
    if (!isWikiPanelPinned) closeWikiPanel();
  }, [isWikiPanelPinned, closeWikiPanel]);

  useShortcuts({ onEscape: handleHideWiki }, [handleHideWiki]);

  const handleClickOverlay = () => {
    closeWikiPanel();
  };

  const onNavigateEvent = useCallback(async () => {
    const pinButton = document.querySelector('.sidebar-pin-btn');
    const isPinButtonHidden = !pinButton || window.getComputedStyle(pinButton).display === 'none';
    if (isPinButtonHidden && !isWikiPanelPinned) {
      closeWikiPanel();
    }
  }, [isWikiPanelPinned, closeWikiPanel]);

  useEffect(() => {
    eventDispatcher.on('navigate', onNavigateEvent);
    return () => eventDispatcher.off('navigate', onNavigateEvent);
  }, [onNavigateEvent]);

  useEffect(() => {
    if (isWikiPanelVisible) {
      updateAppTheme('base-200');
      overlayRef.current = document.querySelector('.overlay') as HTMLDivElement | null;
    } else {
      updateAppTheme('base-100');
      overlayRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWikiPanelVisible]);

  useEffect(() => {
    /** If the active book closes while the wiki targets it, collapse the panel */
    if (isWikiPanelVisible && wikiBookKey && !book) {
      closeWikiPanel();
    }
  }, [isWikiPanelVisible, wikiBookKey, book, closeWikiPanel]);

  if (!isWikiPanelVisible || !wikiBookKey || !book || !wiki) return null;

  return (
    <>
      {!isWikiPanelPinned && (
        <Overlay
          className={clsx('z-[45]', viewSettings?.isEink ? '' : 'bg-black/50 sm:bg-black/20')}
          onDismiss={handleClickOverlay}
        />
      )}
      <div
        ref={wikiPanelRef}
        className={clsx(
          'wiki-panel-container right-0 flex min-w-60 select-none flex-col',
          'full-height font-sans text-base font-normal transition-[padding-top] duration-300 sm:text-sm',
          viewSettings?.isEink ? 'bg-base-100' : 'bg-base-200',
          appService?.hasRoundedWindow && 'rounded-window-top-right rounded-window-bottom-right',
          isWikiPanelPinned ? 'z-20' : 'z-[45] shadow-2xl',
          !isWikiPanelPinned && viewSettings?.isEink && 'border-base-content border-s',
        )}
        role='group'
        aria-label={_('Wiki')}
        dir='ltr'
        style={{
          width: isMobile ? '100%' : `${wikiPanelWidth}`,
          maxWidth: isMobile ? '100%' : `${MAX_WIKI_WIDTH * 100}%`,
          position: isMobile ? 'fixed' : isWikiPanelPinned ? 'relative' : 'absolute',
          paddingTop: isFullHeightInMobile
            ? systemUIVisible
              ? `${Math.max(safeAreaInsets?.top || 0, statusBarHeight)}px`
              : `${safeAreaInsets?.top || 0}px`
            : '0px',
        }}
      >
        <style jsx>{`
          @media (max-width: 640px) {
            .wiki-panel-container {
              border-top-left-radius: 16px;
              border-top-right-radius: 16px;
            }
          }
        `}</style>
        <div
          className={clsx(
            'drag-bar absolute -left-2 top-0 h-full w-0.5 cursor-col-resize bg-transparent p-2',
            isMobile && 'hidden',
          )}
          role='slider'
          tabIndex={0}
          aria-label={_('Resize Wiki')}
          aria-orientation='horizontal'
          aria-valuenow={parseFloat(wikiPanelWidth)}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onKeyDown={handleResizeKeyDown}
        />
        <div className='flex-shrink-0'>
          {isMobile && (
            <div
              role='slider'
              tabIndex={0}
              aria-label={_('Resize Wiki')}
              aria-orientation='vertical'
              aria-valuenow={wikiPanelHeight.current}
              className='drag-handle flex h-6 max-h-6 min-h-6 w-full cursor-row-resize items-center justify-center'
              onMouseDown={handleVerticalDragStart}
              onTouchStart={handleVerticalDragStart}
            >
              <div className='bg-base-content/50 h-1 w-10 rounded-full'></div>
            </div>
          )}
          <WikiPanelHeader
            isPinned={isWikiPanelPinned}
            handleClose={() => closeWikiPanel()}
            handleTogglePin={handleTogglePin}
            namespace={cache?.namespace}
            wiki={wiki}
            onReloadWiki={reloadWiki}
          />
        </div>

        <div className='flex min-h-0 flex-1 flex-row overflow-hidden'>
          {!cache ? (
            <div className='text-base-content/70 flex flex-1 items-center justify-center p-6 text-sm'>
              {_('Loading wiki…')}
            </div>
          ) : (
            <>
              <WikiPageList
                namespaceId={cache.namespace.id}
                pages={Object.values(cache.pages)}
                activePageId={activePageId}
                wiki={wiki}
                onSelectPage={(id) => setActivePageId(id)}
                onReload={reloadWiki}
                spoilerCtx={spoilerCtx}
              />

              <WikiPageEditor
                bookKey={wikiBookKey}
                pageId={activePageId}
                namespaceId={cache.namespace.id}
                wiki={wiki}
                pages={cache.pages}
                blocks={activePageId ? (cache.blocksByPage[activePageId] ?? []) : []}
                tagsById={cache.tags}
                onReload={reloadWiki}
                spoilerCtx={spoilerCtx}
              />
            </>
          )}
        </div>

        <div
          className='flex-shrink-0'
          style={{
            paddingBottom: `${(safeAreaInsets?.bottom || 0) / 2}px`,
          }}
        />
      </div>
    </>
  );
};

export default WikiPanel;
