import { describe, expect, it } from "vitest";
import { SaveManager } from "./SaveManager";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("SaveManager", () => {
  it("returns an empty versioned save when no progress exists", () => {
    expect(new SaveManager(memoryStorage()).load()).toEqual({
      schemaVersion: 1,
      completedLevels: [],
    });
  });

  it("round trips completed levels and copies loaded addresses", () => {
    const storage = memoryStorage();
    const manager = new SaveManager(storage);
    manager.save([
      { gameId: "carKinematics", levelId: 1 },
      { gameId: "netForce", levelId: 2 },
    ]);

    const loaded = manager.load();
    expect(loaded).toEqual({
      schemaVersion: 1,
      completedLevels: [
        { gameId: "carKinematics", levelId: 1 },
        { gameId: "netForce", levelId: 2 },
      ],
    });
    expect(loaded.completedLevels[0]).not.toBe(
      JSON.parse(storage.getItem("escape-route-progress")!).completedLevels[0],
    );
  });

  it.each([
    "not json",
    "null",
    "7",
    JSON.stringify({ schemaVersion: 2, completedLevels: [] }),
    JSON.stringify({ schemaVersion: 1, completedLevels: [null] }),
    JSON.stringify({ schemaVersion: 1, completedLevels: ["not an address"] }),
    JSON.stringify({
      schemaVersion: 1,
      completedLevels: [{ gameId: "", levelId: 1 }],
    }),
    JSON.stringify({
      schemaVersion: 1,
      completedLevels: [{ gameId: "game", levelId: 1.5 }],
    }),
    JSON.stringify({ schemaVersion: 1, completedLevels: "invalid" }),
  ])("treats invalid saved data as empty: %s", (serialized) => {
    const manager = new SaveManager(
      memoryStorage({ "escape-route-progress": serialized }),
    );
    expect(manager.load().completedLevels).toEqual([]);
  });

  it("uses the configured storage key", () => {
    const manager = new SaveManager(memoryStorage(), "test-progress");
    manager.save([{ gameId: "game", levelId: 0 }]);
    expect(manager.load().completedLevels).toEqual([
      { gameId: "game", levelId: 0 },
    ]);
  });

  it("does not swallow storage access failures", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
    };
    const manager = new SaveManager(storage);
    expect(() => manager.load()).toThrow("storage unavailable");
    expect(() => manager.save([])).toThrow("storage unavailable");
  });
});
