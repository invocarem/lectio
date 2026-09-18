/**
 * "Last passage" memory per work, persisted in localStorage so the reader can
 * offer to resume where the user left off.
 *
 * Kept storage-agnostic (`saveLastPosition`/`readLastPosition` accept a
 * storage-like object, defaulting to `localStorage`) so it is testable without
 * a DOM environment.
 */

export type LastPosition = {
  chapterId: string;
  passageIndex: number;
};

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const storageKey = (workId: string) => `lectio:last:${workId}`;

export function saveLastPosition(
  workId: string,
  chapterId: string,
  passageIndex: number,
  store?: StorageLike,
): void {
  try {
    const target = store ?? globalThis.localStorage;
    if (!target) return;
    target.setItem(storageKey(workId), JSON.stringify({ chapterId, passageIndex }));
  } catch {
    /* ignore (private mode, quota, or missing localStorage) */
  }
}

export function readLastPosition(workId: string, store?: StorageLike): LastPosition | null {
  try {
    const raw = store?.getItem(storageKey(workId)) ?? globalThis.localStorage?.getItem?.(storageKey(workId)) ?? null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastPosition>;
    if (
      typeof parsed?.chapterId === "string" &&
      Number.isInteger(parsed.passageIndex) &&
      (parsed.passageIndex as number) >= 0
    ) {
      return { chapterId: parsed.chapterId, passageIndex: parsed.passageIndex as number };
    }
  } catch {
    /* ignore malformed or unreadable payload */
  }
  return null;
}
