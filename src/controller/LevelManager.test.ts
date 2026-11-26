import { afterEach, describe, expect, it, vi } from "vitest";
import { LevelDataConfigFactory } from "../data/LevelDataConfig.ts";
import { createLevelCatalog } from "../data/levelCatalog.ts";
import { LevelManager, type LevelRegistration } from "./LevelManager.ts";

const address = { gameId: "kinematics", levelId: 1 };
function config() {
  vi.spyOn(Math, "random").mockReturnValue(0);
  return new LevelDataConfigFactory().createLevelDataConfig("kinematics", 1);
}
function registration(createConfig: () => unknown): LevelRegistration {
  return { ...address, title: "Velocity", createConfig };
}
afterEach(() => vi.restoreAllMocks());

describe("LevelManager", () => {
  it("lists metadata without generating problems or exposing the factory", () => {
    const createConfig = vi.fn();
    const manager = new LevelManager([registration(createConfig)]);
    expect(manager.listLevels()).toEqual([{ ...address, title: "Velocity" }]);
    expect(createConfig).not.toHaveBeenCalled();
  });

  it("isolates registrations and returned lists from caller mutation", () => {
    const original = config();
    const entry = { ...registration(() => original) };
    const entries = [entry];
    const manager = new LevelManager(entries);
    entry.gameId = "changed";
    entry.createConfig = () => null;
    entries.length = 0;
    const list = manager.listLevels();
    Object.assign(list[0], { gameId: "changed" });
    expect(manager.listLevels()[0]).toMatchObject(address);
    expect(manager.loadModule(address)).toEqual({ ok: true, config: original });
  });

  it.each([
    { gameId: " " },
    { levelId: 0 },
    { levelId: 1.5 },
    { levelId: Number.MAX_SAFE_INTEGER + 1 },
    { title: " " },
  ])("rejects invalid registration %s", (override) => {
    expect(
      () => new LevelManager([{ ...registration(() => null), ...override }]),
    ).toThrow("valid identity and title");
  });

  it("rejects duplicate pairs but allows equal level numbers in different games", () => {
    const entry = registration(() => null);
    expect(() => new LevelManager([entry, entry])).toThrow("Duplicate");
    expect(
      new LevelManager([entry, { ...entry, gameId: "netForce" }]).listLevels(),
    ).toHaveLength(2);
  });

  it("handles an empty catalog", () => {
    const manager = new LevelManager([]);
    expect(manager.listLevels()).toEqual([]);
    expect(manager.loadModule(address)).toMatchObject({
      ok: false,
      reason: "not-found",
    });
  });

  it.each([
    { ...address, gameId: "unknown" },
    { ...address, levelId: 2 },
  ])("rejects unknown identity %s without running factories", (unknown) => {
    const createConfig = vi.fn();
    expect(
      new LevelManager([registration(createConfig)]).loadModule(unknown),
    ).toMatchObject({ ok: false, reason: "not-found" });
    expect(createConfig).not.toHaveBeenCalled();
  });

  it("copies validated configs and generates a new problem on every load", () => {
    const original = config();
    const createConfig = vi.fn(() => original);
    const manager = new LevelManager([registration(createConfig)]);
    const first = manager.loadModule(address);
    const second = manager.loadModule(address);
    expect(first).toEqual({ ok: true, config: original });
    expect(createConfig).toHaveBeenCalledTimes(2);
    if (!first.ok || !second.ok) throw new Error("Expected successful loads");
    expect(first.config).not.toBe(original);
    expect(first.config.expectedUserInput).not.toBe(original.expectedUserInput);
    Object.assign(first.config.expectedUserInput, { velocity: 999 });
    expect(second.config.expectedUserInput.velocity).toBe(5);
    expect(original.expectedUserInput.velocity).toBe(5);
  });

  it.each([null, {}, { ...address }, { invalid: () => {} }])(
    "refuses malformed or uncloneable config %s",
    (candidate) => {
      expect(
        new LevelManager([registration(() => candidate)]).loadModule(address),
      ).toMatchObject({ ok: false, reason: "invalid-config" });
    },
  );

  it.each([{ gameId: "netForce" }, { levelId: 2 }])(
    "refuses a valid config for another identity %s",
    (override) => {
      const candidate = { ...config(), ...override };
      expect(
        new LevelManager([registration(() => candidate)]).loadModule(address),
      ).toMatchObject({ ok: false, reason: "invalid-config" });
    },
  );

  it("returns a safe error and allows retry after generation or validation failure", () => {
    const valid = config();
    const createConfig = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("internal factory details");
      })
      .mockReturnValueOnce(null)
      .mockReturnValue(valid);
    const manager = new LevelManager([registration(createConfig)]);
    const failure = manager.loadModule(address);
    expect(failure).toMatchObject({ ok: false, reason: "generation-failed" });
    expect(JSON.stringify(failure)).not.toContain("internal factory details");
    expect(manager.loadModule(address)).toMatchObject({
      ok: false,
      reason: "invalid-config",
    });
    expect(manager.loadModule(address)).toEqual({ ok: true, config: valid });
  });
});

describe("production level catalog", () => {
  it("loads every real level through the format check", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const manager = new LevelManager(createLevelCatalog());
    expect(
      manager.listLevels().map(({ gameId, levelId }) => ({ gameId, levelId })),
    ).toEqual([
      { gameId: "kinematics", levelId: 1 },
      { gameId: "kinematics", levelId: 2 },
      { gameId: "kinematics", levelId: 3 },
      { gameId: "netForce", levelId: 2 },
      { gameId: "cannonTrajectory", levelId: 1 },
    ]);
    for (const level of manager.listLevels()) {
      expect(manager.loadModule(level)).toMatchObject({
        ok: true,
        config: { gameId: level.gameId, levelId: level.levelId },
      });
    }
  });

  it("uses the injected factory only for the requested level", () => {
    const factory = new LevelDataConfigFactory();
    const create = vi.spyOn(factory, "createLevelDataConfig");
    const manager = new LevelManager(createLevelCatalog(factory));
    expect(create).not.toHaveBeenCalled();
    manager.loadModule({ gameId: "netForce", levelId: 2 });
    expect(create).toHaveBeenCalledExactlyOnceWith("netForce", 2);
  });
});
