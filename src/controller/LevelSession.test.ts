import { afterEach, describe, expect, it, vi } from "vitest";
import { createLevelCatalog } from "../data/levelCatalog.ts";
import { LevelManager } from "./LevelManager.ts";
import { LevelSession, type LevelScreen } from "./LevelSession.ts";

const first = { gameId: "kinematics", levelId: 1 };
function setup(loader = new LevelManager(createLevelCatalog())) {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const screen = {
    clear: vi.fn(),
    showLevel: vi.fn<LevelScreen["showLevel"]>(),
    showLoadError: vi.fn<LevelScreen["showLoadError"]>(),
    showInputErrors: vi.fn(),
    showFeedback: vi.fn(),
  };
  return { screen, session: new LevelSession(loader, screen) };
}
afterEach(() => vi.restoreAllMocks());

describe("LevelSession", () => {
  it("clears the old screen and mounts a real validated problem", () => {
    const { screen, session } = setup();
    expect(session.selectLevel(first).ok).toBe(true);
    expect(screen.clear).toHaveBeenCalledOnce();
    expect(screen.showLevel).toHaveBeenCalledWith(
      expect.objectContaining(first),
      expect.any(Function),
    );
    expect(screen.clear.mock.invocationCallOrder[0]).toBeLessThan(
      screen.showLevel.mock.invocationCallOrder[0],
    );
    expect(screen.showLoadError).not.toHaveBeenCalled();
  });

  it("supports invalid input, wrong answers and correction through the real controller", () => {
    const { screen, session } = setup();
    session.selectLevel(first);
    const submit = screen.showLevel.mock.calls[0][1];
    submit({ ...first, fields: { velocity: "letters" } });
    expect(screen.showInputErrors).toHaveBeenLastCalledWith({
      velocity: "Use digits, like 9.8 or 3e8.",
    });
    expect(screen.showFeedback).toHaveBeenLastCalledWith("");
    submit({ ...first, fields: { velocity: "1" } });
    expect(screen.showInputErrors).toHaveBeenLastCalledWith({});
    expect(screen.showFeedback).toHaveBeenLastCalledWith(
      "Not quite. Check your answers and try again.",
    );
    submit({ ...first, fields: { velocity: "5" } });
    expect(screen.showFeedback).toHaveBeenLastCalledWith("Correct!");
  });

  it.each(["unknown", "invalid", "throws"])(
    "never renders a level on %s load failure",
    (kind) => {
      const manager = new LevelManager(
        kind === "unknown"
          ? []
          : [
              {
                ...first,
                title: "Broken",
                createConfig: () => {
                  if (kind === "throws") throw new Error("broken");
                  return { ...first };
                },
              },
            ],
      );
      const { session, screen } = setup(manager);
      expect(session.selectLevel(first).ok).toBe(false);
      expect(screen.showLevel).not.toHaveBeenCalled();
      expect(screen.showLoadError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
      );
    },
  );

  it("retries the original identity and can recover after a failed generation", () => {
    const catalog = createLevelCatalog();
    const createConfig = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("temporary");
      })
      .mockImplementation(catalog[0].createConfig);
    const { session, screen } = setup(
      new LevelManager([{ ...catalog[0], createConfig }]),
    );
    const requested = { ...first };
    session.selectLevel(requested);
    requested.gameId = "changed";
    screen.showLoadError.mock.calls[0][1]();
    expect(screen.clear).toHaveBeenCalledTimes(2);
    expect(screen.showLevel).toHaveBeenCalledOnce();
    expect(screen.showLevel.mock.calls[0][0]).toMatchObject(first);
  });

  it("ignores old submit callbacks after switching, failed loads, and closing", () => {
    const { session, screen } = setup();
    session.selectLevel(first);
    const oldSubmit = screen.showLevel.mock.calls[0][1];
    session.selectLevel({ gameId: "kinematics", levelId: 2 });
    const nextSubmit = screen.showLevel.mock.calls[1][1];
    oldSubmit({ ...first, fields: { velocity: "5" } });
    expect(screen.showFeedback).not.toHaveBeenCalled();
    session.selectLevel({ gameId: "missing", levelId: 1 });
    nextSubmit({ ...first, fields: {} });
    expect(screen.showFeedback).not.toHaveBeenCalled();
    session.selectLevel(first);
    const submit = screen.showLevel.mock.calls[2][1];
    session.close();
    session.close();
    submit({ ...first, fields: { velocity: "5" } });
    expect(screen.showFeedback).not.toHaveBeenCalled();
  });

  it("ignores a retry from a screen that has been closed", () => {
    const manager = new LevelManager([]);
    const load = vi.spyOn(manager, "loadModule");
    const { session, screen } = setup(manager);
    session.selectLevel(first);
    session.close();
    screen.showLoadError.mock.calls[0][1]();
    expect(load).toHaveBeenCalledOnce();
  });
});
