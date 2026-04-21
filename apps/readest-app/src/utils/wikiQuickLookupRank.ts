import type { WikiPage } from '@/types/wiki';

/** Higher = better match (prefix > word-prefix > substring). */
export function rankWikiTitleSearch(query: string, title: string): number {
  const q = query.trim().toLowerCase();
  const t = title.toLowerCase();
  if (!q) return 1;
  if (t.startsWith(q)) return 3;
  const words = t.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 2;
  if (t.includes(q)) return 1;
  return 0;
}

/** Ranked wiki page titles for quick lookup (tests rely on ordering). */
export function suggestWikiPagesForQuickLookup(
  query: string,
  pages: WikiPage[],
  limit = 8,
): WikiPage[] {
  const q = query.trim();
  if (!q) {
    return [...pages]
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
      .slice(0, limit);
  }
  const scored = pages
    .map((p) => ({ p, s: rankWikiTitleSearch(q, p.title) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      return a.p.title.localeCompare(b.p.title, undefined, { sensitivity: 'base' });
    });
  return scored.slice(0, limit).map((x) => x.p);
}
