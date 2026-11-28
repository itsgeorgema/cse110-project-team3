/** The part of `window` the guard needs, so tests can pass a fake. */
export interface UnloadTarget {
  addEventListener(
    type: "beforeunload",
    listener: (event: Event) => void,
  ): void;
  removeEventListener(
    type: "beforeunload",
    listener: (event: Event) => void,
  ): void;
}

/** Runs a callback later; `setTimeout` in the browser, a fake in tests. */
export type Schedule = (callback: () => void) => void;

/**
 * Asks the browser to confirm closing or reloading the tab until the player
 * leaves through the Quit button (#3). Browsers show their own wording; the
 * page cannot change the message. Instead, `onStay` runs if the page is still
 * open after the prompt, so it can point the player to Quit (#133).
 */
export class LeaveGuard {
  private readonly target: UnloadTarget;
  private readonly onStay: () => void;
  private readonly schedule: Schedule;
  private armed = false;
  private readonly listener = (event: Event): void => {
    event.preventDefault();
    // Older Chromium and Safari still need returnValue set to show the prompt.
    (event as Event & { returnValue: unknown }).returnValue = true;
    // Timers wait while the prompt is open, so this runs only if the player
    // chose to stay. If they leave, the page unloads first.
    this.schedule(this.onStay);
  };

  constructor(
    target: UnloadTarget,
    onStay: () => void = () => {},
    schedule: Schedule = (callback) => setTimeout(callback, 0),
  ) {
    this.target = target;
    this.onStay = onStay;
    this.schedule = schedule;
  }

  get isArmed(): boolean {
    return this.armed;
  }

  /** Starts warning before the tab closes. Calling it again does nothing. */
  arm(): void {
    if (this.armed) return;
    this.target.addEventListener("beforeunload", this.listener);
    this.armed = true;
  }

  /** Lets the tab close or reload without a prompt, e.g. after Quit or an import. */
  disarm(): void {
    if (!this.armed) return;
    this.target.removeEventListener("beforeunload", this.listener);
    this.armed = false;
  }
}
