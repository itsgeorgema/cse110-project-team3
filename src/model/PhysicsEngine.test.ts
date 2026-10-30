import { describe, expect, it } from "vitest";
import { PhysicsEngine } from "./PhysicsEngine";

/* Used in Vite to check if a decimal is within the expected value by
 * 10 ^ (-DECIMAL_PRECISION) / 2. Since DECIMAL_PRECISION = 6, we can be off
 * by the expected value by (10^(-6)) / 2. This is to ensure accuracy of
 * decimal calculations.
 */
const DECIMAL_PRECISION = 9;

describe("test PhysicsEngine calculate velocity", () => {
  it("test displacement of 10meters and time of 5sec", () => {
    const displacement = 10;
    const time = 5;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = 2;
    expect(velocity).toBe(expectedValue);
  });

  it("test displacement of -10meters and time of 5sec", () => {
    const displacement = -10;
    const time = 5;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = -2;
    expect(velocity).toBe(expectedValue);
  });

  it("test displacement of 10meters and time of 3sec", () => {
    const displacement = 10;
    const time = 3;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = 3.333333333;
    expect(velocity).toBeCloseTo(expectedValue, DECIMAL_PRECISION);
  });

  it("test displacement of -10meters and time of 3sec", () => {
    const displacement = -10;
    const time = 3;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = -3.333333333;
    expect(velocity).toBeCloseTo(expectedValue, DECIMAL_PRECISION);
  });

  it("test displacement of 142meters and time of 5sec", () => {
    const displacement = 142;
    const time = 5;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = 28.400000000;
    expect(velocity).toBeCloseTo(expectedValue, DECIMAL_PRECISION);
  });

  it("test displacement of -142meters and time of 5sec", () => {
    const displacement = -142;
    const time = 5;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = -28.400000000;
    expect(velocity).toBeCloseTo(expectedValue, DECIMAL_PRECISION);
  });

  it("test displacement of 21,136,596meters and time of 6123sec", () => {
    const displacement = 21136596;
    const time = 6123;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = 3452;
    expect(velocity).toBe(expectedValue);
  });

  it("test displacement of -21,136,596meters and time of 6123sec", () => {
    const displacement = -21136596;
    const time = 6123;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = -3452;
    expect(velocity).toBe(expectedValue);
  });

  it("test displacement of 5,334,113meters and time of 817sec", () => {
    const displacement = 5334113;
    const time = 817;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = 6528.902080783;
    expect(velocity).toBeCloseTo(expectedValue, DECIMAL_PRECISION);
  });

  it("test displacement of -5,334,113meters and time of 817sec", () => {
    const displacement = -5334113;
    const time = 817;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = -6528.902080783;
    expect(velocity).toBeCloseTo(expectedValue, DECIMAL_PRECISION);
  });

  it("test displacement of 0meters and time of 817sec", () => {
    const displacement = 0;
    const time = 817;
    const velocity = PhysicsEngine.calculateVelocity(displacement, time);
    const expectedValue = 0;
    expect(velocity).toBe(expectedValue);
  });

  it("test displacement of 0meters and time of 0sec, expect error", () => {
    const displacement = 0;
    const time = 0;
    expect(() => PhysicsEngine.calculateVelocity(displacement, time)).
      toThrow("Division by 0: cannot calculate velocity if time is 0");
  });

  it("test displacement of 516meters and time of 0sec, expect error", () => {
    const displacement = 516;
    const time = 0;
    expect(() => PhysicsEngine.calculateVelocity(displacement, time)).
      toThrow("Division by 0: cannot calculate velocity if time is 0");
  });
});