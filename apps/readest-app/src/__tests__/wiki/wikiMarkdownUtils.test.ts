import { describe, test, expect } from 'vitest';

import { preprocessWikiBracketLinks } from '@/app/reader/components/wiki/wikiMarkdownUtils';

describe('preprocessWikiBracketLinks', () => {
  test('converts bracket links to wiki scheme hrefs', () => {
    const out = preprocessWikiBracketLinks('Read [[Character Name]] next.');
    expect(out).toContain('](wiki:');
    expect(out).toContain('Character%20Name');
  });

  test('leaves plain text unchanged', () => {
    expect(preprocessWikiBracketLinks('no links here')).toBe('no links here');
  });
});
