import type { Work, WorkId } from "./types";
import { gradibus } from "./gradibus/work";
import { rule } from "./rule/work";

/**
 * The library registry. Add a new work by giving it an `id` in
 * `src/content/<work>/work.ts` and appending it here.
 */
export const works: Work[] = [gradibus, rule];

export const defaultWorkId: WorkId = "gradibus";

export function getWork(id: WorkId): Work {
  const work = works.find((entry) => entry.id === id);
  if (!work) {
    throw new Error(`Unknown work: ${id}`);
  }
  return work;
}

export function isWorkId(value: string): value is WorkId {
  return works.some((entry) => entry.id === value);
}

export function workHomePath(id: WorkId): string {
  return `/${id}`;
}

export function workContentsPath(id: WorkId): string {
  return `/${id}/contents`;
}

export function workLectioPath(id: WorkId, chapterId: string, passageIndex: number): string {
  return `/${id}/lectio/${chapterId}/${passageIndex}`;
}
