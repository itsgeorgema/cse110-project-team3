import { describe, expect, it, vi } from "vitest";
import { PlaybackListeners } from "./PlaybackListeners";

function started() {
  const listeners = new PlaybackListeners();
  listeners.start();
  return listeners;
}

describe("PlaybackListeners", () => {
  it("notifies every listener once when a playback finishes", () => {
    const listeners = started();
    const a = vi.fn();
    const b = vi.fn();
    listeners.add(a);
    listeners.add(b);

    listeners.finish();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(listeners.isPlaying).toBe(false);
  });

  it("fires once per finish, not again for a repeated finish()", () => {
    const listeners = started();
    const a = vi.fn();
    listeners.add(a);

    listeners.finish();
    listeners.finish();
    expect(a).toHaveBeenCalledTimes(1);

    listeners.start();
    listeners.finish();
    expect(a).toHaveBeenCalledTimes(2);
  });

  it("does nothing on finish() before any start()", () => {
    const listeners = new PlaybackListeners();
    const a = vi.fn();
    listeners.add(a);

    listeners.finish();

    expect(a).not.toHaveBeenCalled();
  });

  it("stays silent when stopped, even if a late finish() follows", () => {
    const listeners = started();
    const a = vi.fn();
    listeners.add(a);

    listeners.stop();
    listeners.finish();

    expect(a).not.toHaveBeenCalled();
    expect(listeners.isPlaying).toBe(false);
  });

  it("stops notifying after unsubscribe, and unsubscribing twice is harmless", () => {
    const listeners = started();
    const a = vi.fn();
    const remove = listeners.add(a);

    remove();
    remove();
    listeners.finish();

    expect(a).not.toHaveBeenCalled();
  });

  it("treats the same function added twice as two listeners", () => {
    const listeners = started();
    const a = vi.fn();
    const removeFirst = listeners.add(a);
    listeners.add(a);

    removeFirst();
    listeners.finish();

    expect(a).toHaveBeenCalledTimes(1);
  });

  it("lets a listener unsubscribe itself while being notified", () => {
    const listeners = started();
    const other = vi.fn();
    const remove = listeners.add(() => remove());
    listeners.add(other);

    listeners.finish();
    listeners.start();
    listeners.finish();

    expect(other).toHaveBeenCalledTimes(2);
  });

  it("does not call a listener added during a notification until the next finish", () => {
    const listeners = started();
    const late = vi.fn();
    listeners.add(() => listeners.add(late));

    listeners.finish();
    expect(late).not.toHaveBeenCalled();

    listeners.start();
    listeners.finish();
    expect(late).toHaveBeenCalledTimes(1);
  });
});
