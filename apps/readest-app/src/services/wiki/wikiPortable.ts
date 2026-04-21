import type { WikiExportV1, WikiNamespace } from '@/types/wiki';
import type { WikiStore } from './WikiStore';

export type { WikiExportV1 };

/** Serialize one namespace to portable JSON (Phase 6). */
export async function exportWikiNamespace(
  store: WikiStore,
  namespaceId: string,
): Promise<WikiExportV1> {
  return store.exportNamespace(namespaceId);
}

/** Import portable JSON; creates `imported:<uuid>` namespace unless `mergeIntoNamespaceId` is set. */
export async function importWikiFromJson(
  store: WikiStore,
  data: WikiExportV1,
  opts: { mergeIntoNamespaceId?: string } = {},
): Promise<WikiNamespace> {
  return store.importNamespace(data, opts);
}

export function isWikiExportV1(value: unknown): value is WikiExportV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v['format'] === 'readest.wiki' &&
    v['version'] === 1 &&
    typeof v['exportedAt'] === 'number' &&
    typeof v['appVersion'] === 'string' &&
    v['namespace'] !== null &&
    typeof v['namespace'] === 'object'
  );
}
