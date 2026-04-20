export interface WikiBracketSuggestContext {
  active: boolean;
  /** Text between [[ and caret (may be empty) */
  query: string;
  /** Replace from this index inclusive (opening [[) */
  bracketOpenIndex: number;
}

/**
 * Detect an active `[[ ...` wiki-link prefix at `caret`.
 */
export function getWikiBracketSuggestContext(
  value: string,
  caret: number,
): WikiBracketSuggestContext | null {
  const before = value.slice(0, caret);
  const match = before.match(/\[\[([^\]\r\n]*)$/);
  if (!match || match.index === undefined) return null;
  const bracketOpenIndex = match.index;
  return {
    active: true,
    query: match[1] ?? '',
    bracketOpenIndex,
  };
}

/**
 * Replace the partial `[[query` segment with `[[title]]`.
 */
export function acceptWikiBracketTitle(
  value: string,
  caret: number,
  ctx: WikiBracketSuggestContext,
  title: string,
): { nextValue: string; nextCaret: number } {
  const head = value.slice(0, ctx.bracketOpenIndex);
  const tail = value.slice(caret);
  const inserted = `[[${title}]]`;
  const nextValue = head + inserted + tail;
  const nextCaret = ctx.bracketOpenIndex + inserted.length;
  return { nextValue, nextCaret };
}
