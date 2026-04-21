import * as CFI from 'foliate-js/epubcfi.js';

import type { Book, ReadingStatus } from '@/types/book';
import { isCfiInLocation } from '@/utils/cfi';
import type { SpoilerContext, SpoilerMode, WikiBlock, WikiNamespace, WikiPage } from '@/types/wiki';

export type { SpoilerContext, SpoilerMode };

/** Build spoiler context for the reader wiki panel or global `/wiki` index. */
export function buildWikiSpoilerContext(
  namespace: WikiNamespace,
  libraryBooks: Book[],
  opts: {
    activeBookKey: string | null;
    activeBook: Book | undefined;
    activeLocation: string | null;
  },
): SpoilerContext {
  const booksByHash = new Map(libraryBooks.map((b) => [b.hash, b]));
  return {
    namespace,
    activeBookKey: opts.activeBookKey,
    activeBookHash: opts.activeBook?.hash ?? null,
    activeLocation: opts.activeLocation,
    booksByHash,
  };
}

/**
 * Derive spoiler mode from namespace flags and the active book's reading status.
 * `activeBook` should be the book currently open in the reader when in-reader; may be null on /wiki.
 */
export function resolveSpoilerMode(ns: WikiNamespace, activeBook: Book | null): SpoilerMode {
  if (ns.spoilerOverride === 'off') return 'off';
  if (ns.spoilerOverride === 'on') return 'reread';
  if (ns.importedMode === 1) return 'imported';
  const status: ReadingStatus | undefined = activeBook?.readingStatus;
  if (status === 'finished' || status === undefined) return 'off';
  return 'live';
}

function isCfiUnlockedVersusLocation(cfi: string, location: string): boolean {
  if (!cfi?.trim() || !location?.trim()) return false;
  if (isCfiInLocation(cfi, location)) return true;
  try {
    const end = CFI.collapse(location, true);
    return CFI.compare(cfi, end) <= 0;
  } catch {
    return false;
  }
}

/**
 * Whether a wiki block's content should be shown (not spoiler-masked).
 */
export function isBlockVisible(block: WikiBlock, ctx: SpoilerContext): boolean {
  const mode = resolveSpoilerMode(ctx.namespace, bookForActiveReader(ctx));
  if (mode === 'off') return true;

  const sameBook = ctx.activeBookHash && block.bookHash === ctx.activeBookHash;
  if (sameBook && ctx.activeLocation?.trim()) {
    return isCfiUnlockedVersusLocation(block.cfi, ctx.activeLocation);
  }
  /** Same book but no live CFI yet — show (avoid blank wiki at session start). */
  if (sameBook && !ctx.activeLocation?.trim()) {
    return true;
  }

  const other = ctx.booksByHash.get(block.bookHash);
  return other?.readingStatus === 'finished';
}

function bookForActiveReader(ctx: SpoilerContext): Book | null {
  if (!ctx.activeBookHash) return null;
  return ctx.booksByHash.get(ctx.activeBookHash) ?? null;
}

/**
 * Whether a wiki page should be treated as unlocked in the page list (not spoiler-masked).
 * Ghost/draft pages are always visible (stubs never reveal canonical content).
 */
export function isPageVisible(page: WikiPage, ctx: SpoilerContext): boolean {
  if (page.isGhost === 1) return true;

  const mode = resolveSpoilerMode(ctx.namespace, bookForActiveReader(ctx));
  if (mode === 'off') return true;

  if (!page.firstSeenCfi?.trim() || !page.firstSeenBookHash) {
    return true;
  }

  const synthetic: WikiBlock = {
    id: page.id,
    pageId: page.id,
    bookHash: page.firstSeenBookHash,
    cfi: page.firstSeenCfi,
    xpointer0: null,
    xpointer1: null,
    quoteText: null,
    noteMarkdown: null,
    tagIds: [],
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    deletedAt: page.deletedAt,
  };

  return isBlockVisible(synthetic, ctx);
}
