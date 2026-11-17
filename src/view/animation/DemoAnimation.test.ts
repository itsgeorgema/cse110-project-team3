import { beforeEach, describe, expect, it } from "vitest";
import type { SimulationState, Vec2 } from "../../model/SimulationState.ts";
import { snapshotState } from "../../model/SimulationState.ts";
import { DEMO_BALL_ID, DemoAnimation, type BallView } from "./DemoAnimation.ts";
import type { FrameScheduler } from "./FrameScheduler.ts";

/** Plays the monitor: callbacks run only when the test calls tick(nowMs). */
class ManualFrames {
  private readonly pending = new Map<number, (nowMs: number) => void>();
  private nextId = 0;

  readonly schedule: FrameScheduler = (callback) => {
    const id = this.nextId++;
    this.pending.set(id, callback);
    return () => {
      this.pending.delete(id);
    };
  };

  /** One screen refresh at nowMs: runs every callback that was waiting for it. */
  tick(nowMs: number): void {
    const due = [...this.pending.values()];
    this.pending.clear();
    for (const callback of due) callback(nowMs);
  }

  get waiting(): number {
    return this.pending.size;
  }
}

/** Records where the ball was drawn, instead of drawing it. */
class RecordingBall implements BallView {
  readonly xs: number[] = [];
  moveTo(position: Vec2): void {
    this.xs.push(position.x);
  }
  get lastX(): number | undefined {
    return this.xs.at(-1);
  }
}

function frame(step: number, timeMs: number, x: number): SimulationState {
  return snapshotState(step, timeMs, [
    { id: DEMO_BALL_ID, position: { x, y: 0 }, angle: 0 },
  ]);
}

// Four frames, 40 ms apart; the ball's x is 0, 10, 20, 30.
const run = [
  frame(0, 0, 0),
  frame(1, 40, 10),
  frame(2, 80, 20),
  frame(3, 120, 30),
];

describe("DemoAnimation", () => {
  let frames: ManualFrames;
  let ball: RecordingBall;
  let engine: DemoAnimation;
  let heard: number;

  beforeEach(() => {
    frames = new ManualFrames();
    ball = new RecordingBall();
    engine = new DemoAnimation(ball, frames.schedule);
    heard = 0;
    engine.onPlaybackFinished(() => heard++);
  });

  it("draws frame 0 as soon as play() is called", () => {
    engine.play(run);

    expect(ball.xs).toEqual([0]);
  });

  it("draws the last frame whose timeMs has been reached", () => {
    engine.play(run);
    frames.tick(1000);
    frames.tick(1079);

    expect(ball.lastX).toBe(10);
  });

  it("measures time from the first refresh after play()", () => {
    engine.play(run);
    frames.tick(5000);
    expect(ball.lastX).toBe(0);

    frames.tick(5040);
    expect(ball.lastX).toBe(10);
  });

  it("shows the same frame at 60 Hz and at 144 Hz", () => {
    function lastXAt100ms(hz: number): number | undefined {
      const monitor = new ManualFrames();
      const recorder = new RecordingBall();
      new DemoAnimation(recorder, monitor.schedule).play(run);
      for (let t = 0; t <= 100; t += 1000 / hz) monitor.tick(1000 + t);
      return recorder.lastX;
    }

    expect(lastXAt100ms(60)).toBe(20);
    expect(lastXAt100ms(144)).toBe(20);
  });

  it("draws the last frame past the end, finishes once, and stops asking for refreshes", () => {
    engine.play(run);
    frames.tick(0);
    frames.tick(500);

    expect(ball.lastX).toBe(30);
    expect(heard).toBe(1);
    expect(frames.waiting).toBe(0);

    frames.tick(600);
    expect(heard).toBe(1);
  });

  it("replaces a playback in progress: the old one never finishes", () => {
    const other = [frame(0, 0, 100), frame(1, 40, 110)];
    engine.play(run);
    frames.tick(0);

    engine.play(other);
    expect(frames.waiting).toBe(1);
    expect(ball.lastX).toBe(100);

    frames.tick(10);
    frames.tick(60);
    frames.tick(500);
    expect(ball.lastX).toBe(110);
    expect(heard).toBe(1);
  });

  it("stays silent after stop() and cancels the pending refresh", () => {
    engine.play(run);
    frames.tick(0);

    engine.stop();
    expect(frames.waiting).toBe(0);

    frames.tick(500);
    expect(heard).toBe(0);
  });

  it("replays the last frames from the start, and does nothing before the first play()", () => {
    engine.replay();
    expect(ball.xs).toEqual([]);
    expect(frames.waiting).toBe(0);

    engine.play(run);
    frames.tick(0);
    frames.tick(500);
    engine.replay();
    expect(ball.lastX).toBe(0);

    frames.tick(1000);
    frames.tick(1500);
    expect(heard).toBe(2);
  });

  it("keeps a replay that a listener starts while being notified", () => {
    let replayed = false;
    engine.onPlaybackFinished(() => {
      if (!replayed) {
        replayed = true;
        engine.replay();
      }
    });
    engine.play(run);
    frames.tick(0);
    frames.tick(500);

    // The replay is running, so stop() must be able to cancel its refresh.
    expect(frames.waiting).toBe(1);
    engine.stop();
    expect(frames.waiting).toBe(0);
  });

  it("throws on an empty list of frames", () => {
    expect(() => engine.play([])).toThrow(/frame/);
  });
});
