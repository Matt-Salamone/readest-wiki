import { describe, test, expect, beforeEach } from 'vitest';

import { useWikiPanelStore } from '@/store/wikiPanelStore';

describe('wikiPanelStore', () => {
  beforeEach(() => {
    useWikiPanelStore.setState({
      isWikiPanelVisible: false,
      isWikiPanelPinned: false,
      wikiPanelWidth: '25%',
      wikiBookKey: null,
      activePageId: null,
    });
  });

  test('open shows panel and stores book + page', () => {
    useWikiPanelStore.getState().open('book-key-1', 'page-a');
    const s = useWikiPanelStore.getState();
    expect(s.isWikiPanelVisible).toBe(true);
    expect(s.wikiBookKey).toBe('book-key-1');
    expect(s.activePageId).toBe('page-a');
  });

  test('close clears visibility', () => {
    useWikiPanelStore.getState().open('bk');
    useWikiPanelStore.getState().close();
    const s = useWikiPanelStore.getState();
    expect(s.isWikiPanelVisible).toBe(false);
    expect(s.wikiBookKey).toBeNull();
    expect(s.activePageId).toBeNull();
  });
});
