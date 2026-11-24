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

/**
 * Asks the browser to confirm closing or reloading the tab until the player
 * leaves through the Quit button (#3). Browsers show their own wording; the
 * page cannot change the message.
 */
export class LeaveGuard {
  private readonly target: UnloadTarget;
  private armed = false;
  private readonly listener = (event: Event): void => {
    event.preventDefault();
    // Older Chromium and Safari still need returnValue set to show the prompt.
    (event as Event & { returnValue: unknown }).returnValue = true;
  };

  constructor(target: UnloadTarget) {
    this.target = target;
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
