import { describe, expect, it } from "vitest";
import { LeaveGuard, type UnloadTarget } from "./LeaveGuard.ts";

function fakeWindow() {
  const listeners = new Set<(event: Event) => void>();
  const target: UnloadTarget = {
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
  /** Fires beforeunload; true means the browser would ask to confirm. */
  const closeTab = () => {
    const event = new Event("beforeunload", { cancelable: true });
    // Like BeforeUnloadEvent, let the guard set returnValue; Node's Event
    // only has a getter.
    Object.defineProperty(event, "returnValue", {
      writable: true,
      value: true,
    });
    listeners.forEach((listener) => listener(event));
    return { prompted: event.defaultPrevented };
  };
  return { target, listeners, closeTab };
}

describe("LeaveGuard (#3)", () => {
  it("does not warn before it is armed", () => {
    const tab = fakeWindow();
    const guard = new LeaveGuard(tab.target);
    expect(guard.isArmed).toBe(false);
    expect(tab.closeTab().prompted).toBe(false);
  });

  it("asks the browser to confirm closing once armed", () => {
    const tab = fakeWindow();
    const guard = new LeaveGuard(tab.target);
    guard.arm();
    expect(guard.isArmed).toBe(true);
    expect(tab.closeTab().prompted).toBe(true);
  });

  it("registers one listener even when armed twice", () => {
    const tab = fakeWindow();
    const guard = new LeaveGuard(tab.target);
    guard.arm();
    guard.arm();
    expect(tab.listeners.size).toBe(1);
  });

  it("lets the tab close after disarm, and can be armed again", () => {
    const tab = fakeWindow();
    const guard = new LeaveGuard(tab.target);
    guard.arm();
    guard.disarm();
    expect(guard.isArmed).toBe(false);
    expect(tab.listeners.size).toBe(0);
    expect(tab.closeTab().prompted).toBe(false);

    guard.disarm();
    guard.arm();
    expect(tab.closeTab().prompted).toBe(true);
  });

  it("runs onWarn at once and onStay after the prompt (#133)", () => {
    const tab = fakeWindow();
    const pending: (() => void)[] = [];
    let warned = 0;
    let stayed = 0;
    const guard = new LeaveGuard(tab.target, {
      onWarn: () => warned++,
      onStay: () => stayed++,
      schedule: (callback) => pending.push(callback),
    });
    guard.arm();
    tab.closeTab();
    expect(warned).toBe(1);
    // onStay waits until the browser prompt has closed.
    expect(stayed).toBe(0);
    pending.forEach((callback) => callback());
    expect(stayed).toBe(1);
  });

  it("runs neither callback once disarmed", () => {
    const tab = fakeWindow();
    const pending: (() => void)[] = [];
    let warned = 0;
    let stayed = 0;
    const guard = new LeaveGuard(tab.target, {
      onWarn: () => warned++,
      onStay: () => stayed++,
      schedule: (callback) => pending.push(callback),
    });
    guard.arm();
    guard.disarm();
    tab.closeTab();
    expect(pending).toHaveLength(0);
    expect(warned).toBe(0);
    expect(stayed).toBe(0);
  });
});
