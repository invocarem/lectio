import { describe, expect, it } from "vitest";
import { readLastPosition, saveLastPosition } from "./lastPosition";

function makeStore(initial: Record<string, string> = {}): {
  backing: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
} {
  const backing = { ...initial };
  return {
    backing,
    getItem: (key) => backing[key] ?? null,
    setItem: (key, value) => {
      backing[key] = value;
    },
  };
}

describe("lastPosition", () => {
  it("round-trips a saved position", () => {
    const store = makeStore();
    saveLastPosition("gradibus", "caput-i", 3, store);
    expect(readLastPosition("gradibus", store)).toEqual({ chapterId: "caput-i", passageIndex: 3 });
  });

  it("keys positions per work", () => {
    const store = makeStore();
    saveLastPosition("gradibus", "caput-i", 3, store);
    expect(readLastPosition("rule", store)).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(readLastPosition("gradibus", makeStore())).toBeNull();
  });

  it("rejects malformed payloads", () => {
    const store = makeStore({ "lectio:last:gradibus": '{"chapterId":"caput-i"}' });
    expect(readLastPosition("gradibus", store)).toBeNull();
  });

  it("rejects negative indices", () => {
    const store = makeStore({ "lectio:last:gradibus": '{"chapterId":"caput-i","passageIndex":-1}' });
    expect(readLastPosition("gradibus", store)).toBeNull();
  });

  it("tolerates a throwing store on write", () => {
    expect(() => saveLastPosition("gradibus", "caput-i", 0, {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    })).not.toThrow();
  });
});
