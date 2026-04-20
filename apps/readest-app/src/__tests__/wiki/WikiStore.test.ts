import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { WikiStore, parseWikiLinks, wikiTitleToSlug } from '@/services/wiki';
import { migrate } from '@/services/database/migrate';
import { getMigrations } from '@/services/database/migrations';
import { NodeDatabaseService } from '@/services/database/nodeDatabaseService';
import type { AppService } from '@/types/system';
import type { DatabaseService } from '@/types/database';
import type { Book } from '@/types/book';
import { md5Fingerprint } from '@/utils/md5';

describe('parseWikiLinks / wikiTitleToSlug', () => {
  test('parses unique links in order', () => {
    expect(parseWikiLinks('Hello [[A]] and [[B]] and [[A]]')).toEqual(['A', 'B']);
  });

  test('trims link targets', () => {
    expect(parseWikiLinks('[[  Kaladin  ]]')).toEqual(['Kaladin']);
  });

  test('slugifies titles', () => {
    expect(wikiTitleToSlug('Character Name')).toBe('character-name');
    expect(wikiTitleToSlug('  X  ')).toBe('x');
  });
});

describe('WikiStore', () => {
  let sharedDb: DatabaseService;
  let mockAppService: AppService;
  let store: WikiStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    sharedDb = await NodeDatabaseService.open(':memory:');
    await migrate(sharedDb, getMigrations('wiki'));
    // WikiStore closes the DB after each operation; keep one in-memory DB alive for the suite.
    vi.spyOn(sharedDb, 'close').mockResolvedValue(undefined);
    mockAppService = {
      openDatabase: vi.fn().mockResolvedValue(sharedDb),
    } as unknown as AppService;
    store = new WikiStore(mockAppService);
  });

  afterEach(async () => {
    vi.mocked(sharedDb.close).mockRestore();
    await sharedDb.close();
  });

  test('resolveNamespaceForBook: series uses md5Fingerprint id', async () => {
    const book: Book = {
      hash: 'h1',
      format: 'EPUB',
      title: 'Book 1',
      author: 'A',
      createdAt: 1,
      updatedAt: 1,
      metadata: {
        title: 'Book 1',
        author: 'A',
        language: 'en',
        series: 'Stormlight',
      },
    };
    const ns = await store.resolveNamespaceForBook(book);
    expect(ns.id).toBe(md5Fingerprint('series:Stormlight'));
    expect(ns.kind).toBe('series');
    expect(ns.title).toBe('Stormlight');
    expect(ns.bookHashes).toContain('h1');
  });

  test('resolveNamespaceForBook: standalone uses book:metaHash when present', async () => {
    const book: Book = {
      hash: 'file-hash',
      metaHash: 'meta-abc',
      format: 'EPUB',
      title: 'Standalone',
      author: 'A',
      createdAt: 1,
      updatedAt: 1,
    };
    const ns = await store.resolveNamespaceForBook(book);
    expect(ns.id).toBe('book:meta-abc');
    expect(ns.kind).toBe('standalone');
    expect(ns.bookHashes).toEqual(['file-hash']);
  });

  test('resolveNamespaceForBook: standalone falls back to hash', async () => {
    const book: Book = {
      hash: 'only-hash',
      format: 'EPUB',
      title: 'S',
      author: 'A',
      createdAt: 1,
      updatedAt: 1,
    };
    const ns = await store.resolveNamespaceForBook(book);
    expect(ns.id).toBe('book:only-hash');
  });

  test('resolveNamespaceForBook: appends second book hash to same namespace', async () => {
    const book1: Book = {
      hash: 'b1',
      format: 'EPUB',
      title: 'T',
      author: 'A',
      createdAt: 1,
      updatedAt: 1,
      metadata: {
        title: 'T',
        author: 'A',
        language: 'en',
        series: 'X',
      },
    };
    const book2: Book = {
      ...book1,
      hash: 'b2',
    };
    await store.resolveNamespaceForBook(book1);
    const ns = await store.resolveNamespaceForBook(book2);
    expect(ns.bookHashes.sort()).toEqual(['b1', 'b2'].sort());
  });

  test('page and block CRUD round-trip', async () => {
    const book: Book = {
      hash: 'h1',
      format: 'EPUB',
      title: 'T',
      author: 'A',
      createdAt: 1,
      updatedAt: 1,
    };
    const ns = await store.resolveNamespaceForBook(book);
    const page = await store.createPage({
      namespaceId: ns.id,
      title: 'Kaladin',
      pageType: 'Person',
      summaryMarkdown: 'A soldier.',
    });
    expect(page.titleSlug).toBe('kaladin');

    const block = await store.createBlock({
      pageId: page.id,
      bookHash: 'h1',
      cfi: 'epubcfi(/6/4)',
      quoteText: 'Hi',
      noteMarkdown: 'Note',
    });
    const blocks = await store.listBlocksForPage(page.id);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.id).toBe(block.id);

    const byBook = await store.listBlocksForBook('h1');
    expect(byBook.map((b) => b.id)).toContain(block.id);

    const tag = await store.createTag({
      namespaceId: ns.id,
      tagName: 'Lore',
      builtInType: 'Lore',
    });
    const tags = await store.listTags(ns.id);
    expect(tags.some((t) => t.id === tag.id)).toBe(true);
  });

  test('upsertWikiLinks creates ghost page for unknown target', async () => {
    const book: Book = {
      hash: 'h1',
      format: 'EPUB',
      title: 'T',
      author: 'A',
      createdAt: 1,
      updatedAt: 1,
    };
    const ns = await store.resolveNamespaceForBook(book);
    const source = await store.createPage({
      namespaceId: ns.id,
      title: 'Source',
      summaryMarkdown: 'See [[Ghost Person]]',
    });

    await store.upsertWikiLinks(source.id, null, source.summaryMarkdown, ns.id);

    const ghost = await store.getPageByTitleSlug(ns.id, wikiTitleToSlug('Ghost Person'));
    expect(ghost).not.toBeNull();
    expect(ghost!.isGhost).toBe(1);

    const links = await store.listLinksToTarget(ghost!.id);
    expect(links.some((l) => l.sourcePageId === source.id && l.sourceBlockId === null)).toBe(true);
  });

  test('upsertWikiLinks replaces link set for same source tuple', async () => {
    const book: Book = {
      hash: 'h1',
      format: 'EPUB',
      title: 'T',
      author: 'A',
      createdAt: 1,
      updatedAt: 1,
    };
    const ns = await store.resolveNamespaceForBook(book);
    const source = await store.createPage({
      namespaceId: ns.id,
      title: 'Src',
      summaryMarkdown: '[[A]]',
    });
    await store.upsertWikiLinks(source.id, null, '[[A]]', ns.id);
    let links = await sharedDb.select<{ target_page_id: string }>(
      `SELECT target_page_id FROM wiki_links WHERE source_page_id = ? AND source_block_id = ''`,
      [source.id],
    );
    expect(links).toHaveLength(1);

    await store.updatePage(source.id, { summaryMarkdown: '[[B]]' });
    const updated = await store.getPage(source.id);
    await store.upsertWikiLinks(source.id, null, updated!.summaryMarkdown, ns.id);
    links = await sharedDb.select<{ target_page_id: string }>(
      `SELECT target_page_id FROM wiki_links WHERE source_page_id = ? AND source_block_id = ''`,
      [source.id],
    );
    expect(links).toHaveLength(1);
  });

  test('renamePage cascades bracket text and updates slug', async () => {
    const book: Book = {
      hash: 'h1',
      format: 'EPUB',
      title: 'T',
      author: 'A',
      createdAt: 1,
      updatedAt: 1,
    };
    const ns = await store.resolveNamespaceForBook(book);
    const target = await store.createPage({
      namespaceId: ns.id,
      title: 'OldName',
      summaryMarkdown: '',
    });
    const src1 = await store.createPage({
      namespaceId: ns.id,
      title: 'One',
      summaryMarkdown: 'Ref [[OldName]] here',
    });
    await store.upsertWikiLinks(src1.id, null, src1.summaryMarkdown, ns.id);

    const blkPage = await store.createPage({
      namespaceId: ns.id,
      title: 'BlockPage',
      summaryMarkdown: '',
    });
    const block = await store.createBlock({
      pageId: blkPage.id,
      bookHash: 'h1',
      cfi: 'cfi',
      noteMarkdown: '[[OldName]] in note',
    });
    await store.upsertWikiLinks(blkPage.id, block.id, block.noteMarkdown ?? '', ns.id);

    const renamed = await store.renamePage(target.id, 'NewName');
    expect(renamed).not.toBeNull();
    expect(renamed!.title).toBe('NewName');
    expect(renamed!.titleSlug).toBe('newname');

    const p1 = await store.getPage(src1.id);
    expect(p1!.summaryMarkdown).toContain('[[NewName]]');
    expect(p1!.summaryMarkdown).not.toContain('[[OldName]]');

    const b = (await store.listBlocksForPage(blkPage.id))[0]!;
    expect(b.noteMarkdown).toContain('[[NewName]]');

    await expect(store.getPageByTitleSlug(ns.id, 'oldname')).resolves.toBeNull();
    await expect(store.getPageByTitleSlug(ns.id, 'newname')).resolves.not.toBeNull();
  });

  test('listSectionCatalog: includes seeded sections in sort order', async () => {
    const rows = await store.listSectionCatalog();
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows[0]?.name).toBe('Appearance');
    expect(rows[1]?.name).toBe('Lore');
    expect(rows[2]?.name).toBe('History');
  });

  test('ensureSectionInCatalog: appends new names and matches existing case-insensitively', async () => {
    const first = await store.ensureSectionInCatalog('MyCustom');
    expect(first).toBe('MyCustom');
    const second = await store.ensureSectionInCatalog('mycustom');
    expect(second).toBe('MyCustom');
    const rows = await store.listSectionCatalog();
    expect(rows.filter((r) => r.name === 'MyCustom').length).toBe(1);
  });
});
