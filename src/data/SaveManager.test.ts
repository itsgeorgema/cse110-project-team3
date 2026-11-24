import { describe, expect, it } from "vitest";
import { SaveManager } from "./SaveManager";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("SaveManager", () => {
  it("returns an empty versioned save when no progress exists", () => {
    expect(new SaveManager(memoryStorage()).load()).toEqual({
      schemaVersion: 2,
      completedLevels: [],
      currentLevel: null,
      attempts: [],
    });
  });

  it("round trips completed levels and copies loaded addresses", () => {
    const storage = memoryStorage();
    const manager = new SaveManager(storage);
    manager.save(
      [
        { gameId: "carKinematics", levelId: 1 },
        { gameId: "netForce", levelId: 2 },
      ],
      { gameId: "netForce", levelId: 2 },
    );

    const loaded = manager.load();
    expect(loaded).toEqual({
      schemaVersion: 2,
      completedLevels: [
        { gameId: "carKinematics", levelId: 1 },
        { gameId: "netForce", levelId: 2 },
      ],
      currentLevel: { gameId: "netForce", levelId: 2 },
      attempts: [],
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
    JSON.stringify({
      schemaVersion: 1,
      completedLevels: [],
      currentLevel: { gameId: "", levelId: 1 },
    }),
  ])("treats invalid saved data as empty: %s", (serialized) => {
    const manager = new SaveManager(
      memoryStorage({ "escape-route-progress": serialized }),
    );
    expect(manager.load().completedLevels).toEqual([]);
  });

  it("uses the configured storage key", () => {
    const manager = new SaveManager(memoryStorage(), "test-progress");
    manager.save([{ gameId: "game", levelId: 0 }], null);
    expect(manager.load()).toEqual({
      schemaVersion: 2,
      completedLevels: [{ gameId: "game", levelId: 0 }],
      currentLevel: null,
      attempts: [],
    });
  });

  it("does not swallow storage access failures", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
      removeItem: () => {
        throw new Error("storage unavailable");
      },
    };
    const manager = new SaveManager(storage);
    expect(() => manager.load()).toThrow("storage unavailable");
    expect(() => manager.save([], null)).toThrow("storage unavailable");
    expect(() => manager.reset()).toThrow("storage unavailable");
  });

  it("upgrades a version 1 save with no current selection", () => {
    const manager = new SaveManager(
      memoryStorage({
        "escape-route-progress": JSON.stringify({
          schemaVersion: 1,
          completedLevels: [{ gameId: "game", levelId: 1 }],
        }),
      }),
    );
    expect(manager.load()).toEqual({
      schemaVersion: 2,
      completedLevels: [{ gameId: "game", levelId: 1 }],
      currentLevel: null,
      attempts: [],
    });
  });

  it("removes saved progress on reset", () => {
    const storage = memoryStorage();
    const manager = new SaveManager(storage);
    manager.save([{ gameId: "game", levelId: 1 }], {
      gameId: "game",
      levelId: 1,
    });
    manager.reset();
    expect(manager.load()).toEqual({
      schemaVersion: 2,
      completedLevels: [],
      currentLevel: null,
      attempts: [],
    });
  });

  it("records a newly completed level without duplicates or losing selection", () => {
    const storage = memoryStorage();
    const manager = new SaveManager(storage);
    const first = { gameId: "game", levelId: 1 };
    const second = { gameId: "game", levelId: 2 };
    manager.save([first], second);

    manager.recordCompletedLevel(second);
    manager.recordCompletedLevel(second);

    expect(manager.load()).toEqual({
      schemaVersion: 2,
      completedLevels: [first, second],
      currentLevel: second,
      attempts: [],
    });
  });

  it("records right and wrong attempts in order and keeps progress", () => {
    const manager = new SaveManager(memoryStorage());
    const first = { gameId: "game", levelId: 1 };
    manager.save([first], first);

    manager.recordAttempt(result(first, { velocity: 3 }, false));
    manager.recordAttempt(result(first, { velocity: 20 }, true));

    expect(manager.load()).toEqual({
      schemaVersion: 2,
      completedLevels: [first],
      currentLevel: first,
      attempts: [
        { ...first, values: { velocity: 3 }, correct: false },
        { ...first, values: { velocity: 20 }, correct: true },
      ],
    });
  });

  it("keeps the attempt history when progress is saved again", () => {
    const manager = new SaveManager(memoryStorage());
    const first = { gameId: "game", levelId: 1 };
    manager.recordAttempt(result(first, { velocity: 20 }, true));

    manager.save([first], { gameId: "game", levelId: 2 });
    manager.recordCompletedLevel({ gameId: "game", levelId: 2 });

    expect(manager.load().attempts).toEqual([
      { ...first, values: { velocity: 20 }, correct: true },
    ]);
  });

  it("restores attempts after a reload and copies their values", () => {
    const storage = memoryStorage();
    const values = { velocity: 20 };
    new SaveManager(storage).recordAttempt(
      result({ gameId: "game", levelId: 1 }, values, true),
    );
    values.velocity = 99;

    const loaded = new SaveManager(storage).load();
    expect(loaded.attempts).toEqual([
      { gameId: "game", levelId: 1, values: { velocity: 20 }, correct: true },
    ]);
  });

  it("clears the attempt history on reset", () => {
    const manager = new SaveManager(memoryStorage());
    manager.recordAttempt(result({ gameId: "game", levelId: 1 }, {}, false));
    manager.reset();
    expect(manager.load().attempts).toEqual([]);
  });

  it.each([
    { schemaVersion: 3, completedLevels: [], attempts: [] },
    { schemaVersion: 2, completedLevels: [], attempts: "invalid" },
    {
      schemaVersion: 2,
      completedLevels: [],
      attempts: [{ gameId: "game", levelId: 1, values: {}, correct: "yes" }],
    },
    {
      schemaVersion: 2,
      completedLevels: [],
      attempts: [
        { gameId: "game", levelId: 1, values: { v: "20" }, correct: true },
      ],
    },
  ])("treats a save with invalid attempts as empty: %j", (saved) => {
    const manager = new SaveManager(
      memoryStorage({ "escape-route-progress": JSON.stringify(saved) }),
    );
    expect(manager.load()).toEqual({
      schemaVersion: 2,
      completedLevels: [],
      currentLevel: null,
      attempts: [],
    });
  });
});

describe("SaveManager progress files (#3)", () => {
  function playedSave() {
    const manager = new SaveManager(memoryStorage());
    manager.save([{ gameId: "kinematics", levelId: 1 }], {
      gameId: "kinematics",
      levelId: 2,
    });
    manager.recordAttempt(
      result({ gameId: "kinematics", levelId: 1 }, { velocity: 5 }, true),
    );
    return manager;
  }

  it("exports the stored progress as readable JSON", () => {
    const exported = playedSave().exportSave();
    expect(exported.endsWith("\n")).toBe(true);
    expect(exported).toContain('\n  "schemaVersion": 2');
    expect(JSON.parse(exported)).toEqual({
      schemaVersion: 2,
      completedLevels: [{ gameId: "kinematics", levelId: 1 }],
      currentLevel: { gameId: "kinematics", levelId: 2 },
      attempts: [
        {
          gameId: "kinematics",
          levelId: 1,
          values: { velocity: 5 },
          correct: true,
        },
      ],
    });
  });

  it("exports an empty save when nothing is stored", () => {
    expect(JSON.parse(new SaveManager(memoryStorage()).exportSave())).toEqual({
      schemaVersion: 2,
      completedLevels: [],
      currentLevel: null,
      attempts: [],
    });
  });

  it("round trips an exported file onto another device", () => {
    const exported = playedSave().exportSave();
    const otherDevice = new SaveManager(memoryStorage());

    const imported = otherDevice.importSave(exported);

    expect(imported).toEqual(JSON.parse(exported));
    expect(otherDevice.load()).toEqual(JSON.parse(exported));
  });

  it("replaces existing progress instead of merging with it", () => {
    const manager = playedSave();
    manager.importSave(
      JSON.stringify({
        schemaVersion: 2,
        completedLevels: [],
        currentLevel: null,
        attempts: [],
      }),
    );
    expect(manager.load()).toEqual({
      schemaVersion: 2,
      completedLevels: [],
      currentLevel: null,
      attempts: [],
    });
  });

  it("upgrades an imported version 1 file", () => {
    const manager = new SaveManager(memoryStorage());
    const imported = manager.importSave(
      JSON.stringify({
        schemaVersion: 1,
        completedLevels: [{ gameId: "kinematics", levelId: 1 }],
      }),
    );
    expect(imported).toEqual({
      schemaVersion: 2,
      completedLevels: [{ gameId: "kinematics", levelId: 1 }],
      currentLevel: null,
      attempts: [],
    });
    expect(manager.load()).toEqual(imported);
  });

  it.each([
    "",
    "not json",
    "null",
    "[]",
    JSON.stringify({ schemaVersion: 3, completedLevels: [], attempts: [] }),
    JSON.stringify({ schemaVersion: 2, completedLevels: [{ levelId: 1 }] }),
  ])("rejects an invalid file and keeps current progress: %j", (file) => {
    const manager = playedSave();
    const before = manager.load();

    expect(() => manager.importSave(file)).toThrow(
      "This file is not an Escape Route progress file.",
    );
    expect(manager.load()).toEqual(before);
  });
});

function result(
  level: { gameId: string; levelId: number },
  values: Record<string, number>,
  correct: boolean,
) {
  return {
    submittedAnswer: { ...level, values, units: {} },
    correct,
    feedback: "",
  };
}
