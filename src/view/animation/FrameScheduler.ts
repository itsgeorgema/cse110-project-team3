/**
 * Asks for one callback on the next screen refresh, with a timestamp in ms.
 * Returns a function that cancels the request. Injected into animation classes
 * so tests can play the monitor and step frames by hand (#24).
 */
export type FrameScheduler = (callback: (nowMs: number) => void) => () => void;

/** The browser's scheduler: requestAnimationFrame. */
export const browserFrames: FrameScheduler = (callback) => {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
};
