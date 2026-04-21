import { describe, it, expect } from 'vitest';

import {
  buildWikiSpoilerContext,
  isBlockVisible,
  isPageVisible,
  resolveSpoilerMode,
} from '@/app/reader/utils/wikiSpoiler';
import type { Book } from '@/types/book';
import type { WikiBlock, WikiNamespace, WikiPage } from '@/types/wiki';

function ns(partial: Partial<WikiNamespace> = {}): WikiNamespace {
  return {
    id: 'book:test',
    kind: 'standalone',
    title: 'T',
    importedMode: 0,
    spoilerOverride: null,
    bookHashes: ['h1'],
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

function book(overrides: Partial<Book> = {}): Book {
  return {
    hash: 'h1',
    format: 'EPUB',
    title: 'B',
    author: 'A',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function blk(overrides: Partial<WikiBlock> = {}): WikiBlock {
  return {
    id: 'b1',
    pageId: 'p1',
    bookHash: 'h1',
    cfi: 'epubcfi(/6/4[chap]!/4/2/2)',
    xpointer0: null,
    xpointer1: null,
    quoteText: 'q',
    noteMarkdown: null,
    tagIds: [],
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    ...overrides,
  };
}

describe('resolveSpoilerMode', () => {
  it('returns off when override is off', () => {
    expect(resolveSpoilerMode(ns({ spoilerOverride: 'off' }), book())).toBe('off');
  });

  it('returns reread when override is on', () => {
    expect(resolveSpoilerMode(ns({ spoilerOverride: 'on' }), book())).toBe('reread');
  });

  it('returns imported when importedMode is 1', () => {
    expect(resolveSpoilerMode(ns({ importedMode: 1 }), book())).toBe('imported');
  });

  it('returns off for finished or undefined reading status', () => {
    expect(resolveSpoilerMode(ns(), book({ readingStatus: 'finished' }))).toBe('off');
    expect(resolveSpoilerMode(ns(), null)).toBe('off');
  });

  it('returns live for reading', () => {
    expect(resolveSpoilerMode(ns(), book({ readingStatus: 'reading' }))).toBe('live');
  });
});

describe('isBlockVisible', () => {
  const loc = 'epubcfi(/6/4[chap]!/4/2/8)';

  it('shows all when mode is off', () => {
    const ctx = buildWikiSpoilerContext(ns({ spoilerOverride: 'off' }), [book()], {
      activeBookKey: 'k',
      activeBook: book({ readingStatus: 'reading' }),
      activeLocation: loc,
    });
    expect(isBlockVisible(blk(), ctx)).toBe(true);
  });

  it('shows block at or before location for same book', () => {
    const ctx = buildWikiSpoilerContext(ns(), [book({ hash: 'h1', readingStatus: 'reading' })], {
      activeBookKey: 'k',
      activeBook: book({ hash: 'h1', readingStatus: 'reading' }),
      activeLocation: loc,
    });
    const before = blk({ cfi: 'epubcfi(/6/4[chap]!/4/2/1)' });
    expect(isBlockVisible(before, ctx)).toBe(true);
  });

  it('hides block after location for same book when gated', () => {
    const ctx = buildWikiSpoilerContext(ns({ importedMode: 1 }), [book({ hash: 'h1' })], {
      activeBookKey: 'k',
      activeBook: book({ hash: 'h1', readingStatus: 'reading' }),
      activeLocation: loc,
    });
    const after = blk({ cfi: 'epubcfi(/6/4[chap]!/4/2/99)' });
    expect(isBlockVisible(after, ctx)).toBe(false);
  });

  it('shows blocks from other books when that book is finished', () => {
    const ctx = buildWikiSpoilerContext(
      ns({ importedMode: 1 }),
      [
        book({ hash: 'h1', readingStatus: 'reading' }),
        book({ hash: 'h2', readingStatus: 'finished' }),
      ],
      {
        activeBookKey: 'k',
        activeBook: book({ hash: 'h1', readingStatus: 'reading' }),
        activeLocation: loc,
      },
    );
    expect(isBlockVisible(blk({ bookHash: 'h2' }), ctx)).toBe(true);
  });
});

describe('isPageVisible', () => {
  it('always shows ghost pages', () => {
    const ctx = buildWikiSpoilerContext(ns({ importedMode: 1 }), [book()], {
      activeBookKey: null,
      activeBook: undefined,
      activeLocation: null,
    });
    const page: WikiPage = {
      id: 'p1',
      namespaceId: 'n',
      title: 'G',
      titleSlug: 'g',
      pageType: 'Misc',
      summaryMarkdown: '',
      firstSeenCfi: 'epubcfi(/99)',
      firstSeenBookHash: 'h9',
      isGhost: 1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };
    expect(isPageVisible(page, ctx)).toBe(true);
  });
});
