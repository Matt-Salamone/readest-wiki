/** Same realm as UI; survives duplicate chunks better than `globalThis` alone in some embeds. */
function mutexHost(): Record<string, WikiDbMutex | undefined> {
  try {
    if (typeof window !== 'undefined' && window.top) {
      return window.top as unknown as Record<string, WikiDbMutex | undefined>;
    }
  } catch {
    /* cross-origin top */
  }
  return globalThis as unknown as Record<string, WikiDbMutex | undefined>;
}

const WIKI_DB_MUTEX_KEY = '__readestWikiDbMutex' as const;

type WikiDbMutex = { chain: Promise<unknown> };

function getWikiDbMutex(): WikiDbMutex {
  const host = mutexHost();
  if (!host[WIKI_DB_MUTEX_KEY]) {
    host[WIKI_DB_MUTEX_KEY] = { chain: Promise.resolve() };
  }
  return host[WIKI_DB_MUTEX_KEY]!;
}

/**
 * Serialize every wiki DB task on one global chain. Used by `WikiStore.withDb` and
 * `useWikiStore.closeDb`-style drains.
 */
export function runOnWikiDb<T>(task: () => Promise<T>): Promise<T> {
  const m = getWikiDbMutex();
  const run = m.chain.then(() => task());
  m.chain = run.catch(() => {});
  return run;
}
