import { create } from 'zustand';

interface WikiPanelState {
  isWikiPanelVisible: boolean;
  isWikiPanelPinned: boolean;
  wikiPanelWidth: string;
  /** Book key for the reader tab showing this wiki */
  wikiBookKey: string | null;
  activePageId: string | null;
  open: (bookKey: string, pageId?: string | null) => void;
  close: () => void;
  setWikiPanelPinned: (pinned: boolean) => void;
  setWikiPanelWidth: (width: string) => void;
  setActivePageId: (id: string | null) => void;
}

export const useWikiPanelStore = create<WikiPanelState>((set) => ({
  isWikiPanelVisible: false,
  isWikiPanelPinned: false,
  wikiPanelWidth: '25%',
  wikiBookKey: null,
  activePageId: null,

  open: (bookKey, pageId = null) =>
    set({
      isWikiPanelVisible: true,
      wikiBookKey: bookKey,
      activePageId: pageId ?? null,
    }),

  close: () =>
    set({
      isWikiPanelVisible: false,
      wikiBookKey: null,
      activePageId: null,
    }),

  setWikiPanelPinned: (pinned) => set({ isWikiPanelPinned: pinned }),

  setWikiPanelWidth: (width) => set({ wikiPanelWidth: width }),

  setActivePageId: (id) => set({ activePageId: id }),
}));
