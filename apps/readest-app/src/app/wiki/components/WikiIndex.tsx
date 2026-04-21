'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LuBookOpen } from 'react-icons/lu';

import WindowButtons from '@/components/WindowButtons';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useTrafficLight } from '@/hooks/useTrafficLight';
import { useThemeStore } from '@/store/themeStore';
import { useWikiStore } from '@/store/wikiStore';
import { WikiStore } from '@/services/wiki';
import { navigateToLibrary } from '@/utils/nav';
import { useAppRouter } from '@/hooks/useAppRouter';
import type { WikiNamespace } from '@/types/wiki';

import WikiNamespaceView from './WikiNamespaceView';

const WikiIndex: React.FC = () => {
  const _ = useTranslation();
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const { appService } = useEnv();
  const {
    safeAreaInsets: insets,
    isRoundedWindow,
    systemUIVisible,
    statusBarHeight,
  } = useThemeStore();
  const { isTrafficLightVisible } = useTrafficLight();

  const headerRef = useRef<HTMLDivElement>(null);
  const lastReplacedRef = useRef('');

  const wiki = useMemo(() => (appService ? new WikiStore(appService) : null), [appService]);
  const allNamespaces = useWikiStore((s) => s.allNamespaces);
  const loadAllNamespaces = useWikiStore((s) => s.loadAllNamespaces);
  const loadNamespaceById = useWikiStore((s) => s.loadNamespaceById);
  const setActiveNamespace = useWikiStore((s) => s.setActiveNamespace);

  const [pageCountByNs, setPageCountByNs] = useState<Record<string, number>>({});
  const [blockCountByNs, setBlockCountByNs] = useState<Record<string, number>>({});
  const [indexBootstrapDone, setIndexBootstrapDone] = useState(false);

  const windowButtonVisible = appService?.hasWindowBar && !isTrafficLightVisible;

  useTheme({ systemUIVisible: true, appThemeColor: 'base-200' });

  useEffect(() => {
    if (!wiki) {
      setIndexBootstrapDone(false);
      return;
    }
    let cancelled = false;
    setIndexBootstrapDone(false);
    void (async () => {
      await loadAllNamespaces(wiki);
      if (cancelled) return;
      const pages = await wiki.listAllPages();
      const blocks = await wiki.countBlocksByNamespace();
      const pc: Record<string, number> = {};
      for (const p of pages) {
        pc[p.namespaceId] = (pc[p.namespaceId] ?? 0) + 1;
      }
      if (!cancelled) {
        setPageCountByNs(pc);
        setBlockCountByNs(blocks);
        setIndexBootstrapDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wiki, loadAllNamespaces]);

  const nsParam = searchParams?.get('ns') ?? '';
  const pageParam = searchParams?.get('page') ?? '';

  const selectedNsId = useMemo(() => {
    if (nsParam && allNamespaces.some((n) => n.id === nsParam)) return nsParam;
    if (allNamespaces[0]) return allNamespaces[0].id;
    return '';
  }, [nsParam, allNamespaces]);

  useEffect(() => {
    if (!wiki || !selectedNsId || !indexBootstrapDone) return;
    void loadNamespaceById(wiki, selectedNsId);
    setActiveNamespace(selectedNsId);
  }, [wiki, selectedNsId, loadNamespaceById, setActiveNamespace, indexBootstrapDone]);

  const replaceWikiUrl = useCallback(
    (params: URLSearchParams) => {
      const next = `/wiki?${params.toString()}`;
      if (lastReplacedRef.current === next) return;
      lastReplacedRef.current = next;
      router.replace(next, { scroll: false });
    },
    [router],
  );

  /** Canonicalize `ns` (and optional `page`) in the URL when missing or invalid. */
  useEffect(() => {
    if (!selectedNsId || allNamespaces.length === 0) return;
    const known = allNamespaces.some((n) => n.id === nsParam);
    if (nsParam && known && nsParam === selectedNsId) return;
    if (nsParam && !known) {
      const params = new URLSearchParams();
      params.set('ns', selectedNsId);
      replaceWikiUrl(params);
      return;
    }
    if (!nsParam) {
      const params = new URLSearchParams();
      params.set('ns', selectedNsId);
      if (pageParam) params.set('page', pageParam);
      replaceWikiUrl(params);
    }
  }, [selectedNsId, allNamespaces, nsParam, pageParam, replaceWikiUrl]);

  const setUrlNsAndPage = (nsId: string, pageId: string | null) => {
    const params = new URLSearchParams();
    params.set('ns', nsId);
    if (pageId) params.set('page', pageId);
    replaceWikiUrl(params);
  };

  const handleSelectNamespace = (ns: WikiNamespace) => {
    setUrlNsAndPage(ns.id, null);
  };

  const handleSelectPage = (pageId: string | null) => {
    if (!selectedNsId) return;
    setUrlNsAndPage(selectedNsId, pageId);
  };

  if (!appService || !insets) {
    return <div className='full-height bg-base-200' />;
  }

  return (
    <div
      className={clsx(
        'text-base-content full-height bg-base-200 flex select-none flex-col overflow-hidden',
        appService?.hasRoundedWindow && isRoundedWindow && 'window-border rounded-window',
      )}
    >
      <header
        ref={headerRef}
        className={clsx(
          'titlebar border-base-300 flex h-12 flex-shrink-0 items-center justify-between border-b px-4',
          windowButtonVisible ? 'sm:pr-2' : 'sm:pr-4',
          isTrafficLightVisible ? 'ps-14' : 'ps-0',
        )}
        style={{
          marginTop: appService?.hasSafeAreaInset
            ? `max(${insets.top}px, ${systemUIVisible ? statusBarHeight : 0}px)`
            : appService?.hasTrafficLight
              ? '-2px'
              : '0px',
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <div className='exclude-title-bar-mousedown flex items-center gap-2'>
          <LuBookOpen className='text-base-content/80 h-5 w-5' aria-hidden />
          <h1 className='text-base font-semibold'>{_('Wiki')}</h1>
        </div>
        <div className='exclude-title-bar-mousedown flex items-center gap-1'>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => navigateToLibrary(router, '')}
          >
            {_('Library')}
          </button>
          {appService?.hasWindowBar && (
            <WindowButtons
              headerRef={headerRef}
              showMinimize={windowButtonVisible}
              showMaximize={windowButtonVisible}
              showClose={windowButtonVisible}
            />
          )}
        </div>
      </header>

      <div
        className='flex min-h-0 flex-1 flex-col sm:flex-row'
        style={{
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
          paddingBottom: `${insets.bottom}px`,
        }}
      >
        <aside className='border-base-300 flex max-h-48 min-h-0 w-full flex-shrink-0 flex-col border-b sm:max-h-none sm:w-56 sm:border-b-0 sm:border-e'>
          <div className='text-base-content/60 px-2 py-2 text-xs font-semibold uppercase tracking-wide'>
            {_('Namespaces')}
          </div>
          <ul className='min-h-0 flex-1 overflow-y-auto px-1 pb-2'>
            {allNamespaces.map((ns) => (
              <li key={ns.id}>
                <button
                  type='button'
                  className={clsx(
                    'exclude-title-bar-mousedown hover:bg-base-300 mb-0.5 w-full rounded-md px-2 py-2 text-left text-sm',
                    selectedNsId === ns.id && 'bg-base-300',
                  )}
                  onClick={() => handleSelectNamespace(ns)}
                >
                  <span className='line-clamp-2 break-words'>{ns.title}</span>
                  <span className='text-base-content/50 mt-0.5 block text-xs'>
                    {pageCountByNs[ns.id] ?? 0} {_('pages')}
                    {' · '}
                    {blockCountByNs[ns.id] ?? 0} {_('blocks')}
                  </span>
                </button>
              </li>
            ))}
            {allNamespaces.length === 0 ? (
              <li className='text-base-content/60 px-2 py-4 text-center text-sm'>
                {_('No wikis yet. Open a book and add wiki pages from the reader.')}
              </li>
            ) : null}
          </ul>
        </aside>

        <main className='flex min-h-0 min-w-0 flex-1 flex-col'>
          {wiki && selectedNsId && indexBootstrapDone ? (
            <WikiNamespaceView
              namespaceId={selectedNsId}
              activePageId={pageParam || null}
              wiki={wiki}
              onSelectPage={handleSelectPage}
            />
          ) : (
            <div className='text-base-content/70 flex flex-1 items-center justify-center p-6 text-sm'>
              {_('Select a namespace')}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default WikiIndex;
