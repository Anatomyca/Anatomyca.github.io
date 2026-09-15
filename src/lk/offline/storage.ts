import { get, set } from 'idb-keyval';

/**
 * Bookmarks and progress live in the reader's own browser. There are no
 * accounts and no server, so nothing here ever leaves the device.
 * Every call is guarded: private mode and blocked site data are normal.
 */
const BOOKMARKS = 'anatomyca.bookmarks';

export async function loadBookmarks(): Promise<string[]> {
  try {
    return (await get<string[]>(BOOKMARKS)) ?? [];
  } catch {
    return [];
  }
}

export async function saveBookmarks(ids: readonly string[]): Promise<void> {
  try {
    await set(BOOKMARKS, [...ids]);
  } catch {
    // Storage unavailable: bookmarks simply will not survive a reload.
  }
}
