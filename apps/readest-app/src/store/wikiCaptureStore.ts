import { create } from 'zustand';

export interface WikiCaptureOpenPayload {
  bookKey: string;
  /** Canonical CFI for the selection anchor; null for header quick-note */
  cfi: string | null;
  /** Selected quote text; null when opening without a selection */
  quoteText: string | null;
  /** DOM range for xpointer derivation (same-document only) */
  selectionRange: Range | null;
}

interface WikiCaptureState {
  isOpen: boolean;
  bookKey: string | null;
  cfi: string | null;
  quoteText: string | null;
  selectionRange: Range | null;
  openFromSelection: (payload: WikiCaptureOpenPayload) => void;
  openQuickNote: (bookKey: string) => void;
  close: () => void;
}

const emptyPayload = (): Omit<WikiCaptureOpenPayload, 'bookKey'> & { bookKey: string | null } => ({
  bookKey: null,
  cfi: null,
  quoteText: null,
  selectionRange: null,
});

export const useWikiCaptureStore = create<WikiCaptureState>((set) => ({
  isOpen: false,
  bookKey: null,
  cfi: null,
  quoteText: null,
  selectionRange: null,

  openFromSelection: (payload) =>
    set({
      isOpen: true,
      bookKey: payload.bookKey,
      cfi: payload.cfi,
      quoteText: payload.quoteText,
      selectionRange: payload.selectionRange,
    }),

  openQuickNote: (bookKey) =>
    set({
      isOpen: true,
      bookKey,
      cfi: null,
      quoteText: null,
      selectionRange: null,
    }),

  close: () =>
    set({
      isOpen: false,
      ...emptyPayload(),
    }),
}));
