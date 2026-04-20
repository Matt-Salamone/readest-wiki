import { describe, test, expect } from 'vitest';

import {
  acceptWikiBracketTitle,
  getWikiBracketSuggestContext,
} from '@/app/reader/hooks/useWikiLinkSuggest';

describe('getWikiBracketSuggestContext', () => {
  test('returns null when no opening brackets', () => {
    expect(getWikiBracketSuggestContext('hello world', 11)).toBeNull();
  });

  test('detects active wiki bracket prefix', () => {
    const v = 'Intro [[Kal';
    const caret = v.length;
    const ctx = getWikiBracketSuggestContext(v, caret);
    expect(ctx?.active).toBe(true);
    expect(ctx?.query).toBe('Kal');
    expect(ctx?.bracketOpenIndex).toBe(v.indexOf('[['));
  });

  test('accept inserts full bracket link', () => {
    const v = 'See [[Kal';
    const caret = v.length;
    const ctx = getWikiBracketSuggestContext(v, caret);
    expect(ctx).not.toBeNull();
    const { nextValue, nextCaret } = acceptWikiBracketTitle(v, caret, ctx!, 'Kaladin');
    expect(nextValue).toBe('See [[Kaladin]]');
    expect(nextCaret).toBe(nextValue.length);
  });
});
