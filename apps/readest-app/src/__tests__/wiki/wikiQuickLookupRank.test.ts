import { describe, test, expect } from 'vitest';
import type { WikiPage } from '@/types/wiki';
import { rankWikiTitleSearch, suggestWikiPagesForQuickLookup } from '@/utils/wikiQuickLookupRank';

const page = (title: string, id = '1'): WikiPage => ({
  id,
  namespaceId: 'ns',
  title,
  titleSlug: title.toLowerCase().replace(/\s+/g, '-'),
  pageType: 'Person',
  summaryMarkdown: '',
  firstSeenCfi: null,
  firstSeenBookHash: null,
  isGhost: 0,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
});

describe('wikiQuickLookupRank', () => {
  test('rankWikiTitleSearch: prefix beats substring', () => {
    expect(rankWikiTitleSearch('kal', 'Kaladin')).toBe(3);
    expect(rankWikiTitleSearch('lad', 'Kaladin')).toBe(1);
  });

  test('rankWikiTitleSearch: word prefix between prefix and substring', () => {
    expect(rankWikiTitleSearch('storm', 'The Stormlight Archive')).toBe(2);
  });

  test('suggestWikiPagesForQuickLookup: ordering by score then title', () => {
    const pages = [page('Kaladin', 'a'), page('Kale', 'b'), page('Bridge Four', 'c')];
    const out = suggestWikiPagesForQuickLookup('kal', pages, 8);
    /** Same prefix score (3): tie-break by title A–Z */
    expect(out.map((p) => p.title)).toEqual(['Kaladin', 'Kale']);
  });
});
