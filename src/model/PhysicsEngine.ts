import type { SimulationRequest, SimulationRunner } from "./SimulationRunner";
import type { SimulationState } from "./SimulationState";

export class PhysicsEngine {
  /** Runs a simulation through whichever runner the caller wires in. */
  public static simulate(
    runner: SimulationRunner,
    request: SimulationRequest,
  ): SimulationState[] {
    return runner.run(request);
  }

  private static validateNumber(value: number, name: string): void {
    if (typeof value !== "number") {
      throw new TypeError(`${name} must be a number.`);
    }

    if (!Number.isFinite(value)) {
      throw new RangeError(`${name} must be finite. Received: ${value}`);
    }
  }

  private static validateResult(result: number, operation: string): number {
    if (!Number.isFinite(result)) {
      throw new RangeError(`${operation} produced a non-finite result.`);
    }

    return result;
  }

  // Multiplication
  public static multiply(a: number, b: number): number {
    this.validateNumber(a, "PhysicsEngine.multiply input variable a");
    this.validateNumber(b, "PhysicsEngine.multiply input variable b");

    return this.validateResult(a * b, "PhysicsEngine.multiply");
  }

  // Division
  public static divide(a: number, b: number): number {
    this.validateNumber(a, "PhysicsEngine.divide input variable a");
    this.validateNumber(b, "PhysicsEngine.divide input variable b");

    if (b === 0) {
      throw new RangeError("PhysicsEngine.divide: Cannot divide by zero.");
    }

    return this.validateResult(a / b, "PhysicsEngine.divide");
  }

  public static sqrt(value: number): number {
    this.validateNumber(value, "PhysicsEngine.sqrt input variable value");
    if (value < 0) {
      throw new RangeError(
        `PhysicsEngine.sqrt.value must be >= 0. Received: ${value}`,
      );
    }

    return Math.sqrt(value);
  }

  public static calculateVelocity(displacement: number, time: number) {
    this.validateNumber(
      displacement,
      "PhysicsEngine.calculateVelocity input variable displacement",
    );
    this.validateNumber(
      time,
      "PhysicsEngine.calculateVelocity input variable time",
    );
    if (time <= 0) {
      throw new RangeError(
        `PhysicsEngine.calculateVelocity.time must be positive. Received: ${time}`,
      );
    }

    return this.divide(displacement, time);
  }

  public static add(a: number, b: number): number {
    this.validateNumber(a, "PhysicsEngine.add input variable a");
    this.validateNumber(b, "PhysicsEngine.add input variable b");

    return this.validateResult(a + b, "PhysicsEngine.add");
  }

  public static subtract(a: number, b: number): number {
    this.validateNumber(a, "PhysicsEngine.subtract input variable a");
    this.validateNumber(b, "PhysicsEngine.subtract input variable b");

    return this.validateResult(a - b, "PhysicsEngine.subtract");
  }

  public static calculateDisplacement(velocity: number, time: number) {
    this.validateNumber(
      velocity,
      "PhysicsEngine.calculateDisplacement input variable velocity",
    );
    this.validateNumber(
      time,
      "PhysicsEngine.calculateDisplacement input variable time",
    );
    if (time < 0) {
      throw new RangeError(
        `PhysicsEngine.calculateDisplacement.time must be >= 0. Received: ${time}`,
      );
    }

    return this.multiply(velocity, time);
  }

  public static calculateAcceleration(
    initialVelocity: number,
    finalVelocity: number,
    time: number,
  ) {
    this.validateNumber(
      initialVelocity,
      "PhysicsEngine.calculateAcceleration input variable initial velocity",
    );
    this.validateNumber(
      finalVelocity,
      "PhysicsEngine.calculateAcceleration input variable final velocity",
    );
    this.validateNumber(
      time,
      "PhysicsEngine.calculateAcceleration input variable time",
    );
    if (time <= 0) {
      throw new RangeError(
        `PhysicsEngine.calculateAcceleration.time must be > 0. Received: ${time}`,
      );
    }

    return this.divide(this.subtract(finalVelocity, initialVelocity), time);
  }

  /** Mean velocity over a nonnegative interval of constant acceleration (#17). */
  public static calculateAverageVelocity(
    constantAcceleration: number,
    startingVelocity: number,
    time: number,
  ): number {
    this.validateNumber(startingVelocity, "startingVelocity");
    // calculateDisplacement validates both acceleration and the time interval.
    const change = this.calculateDisplacement(constantAcceleration, time);
    return this.add(startingVelocity, this.divide(change, 2));
  }

  /** Signed displacement v0*t + a*t²/2; distance for forward-only motion (#17). */
  public static calculateDistance(
    constantAcceleration: number,
    startingVelocity: number,
    time: number,
  ): number {
    return this.calculateDisplacement(
      this.calculateAverageVelocity(
        constantAcceleration,
        startingVelocity,
        time,
      ),
      time,
    );
  }

  public static calculateForce(mass: number, acceleration: number) {
    this.validateNumber(
      mass,
      "PhysicsEngine.calculateForce input variable mass",
    );
    this.validateNumber(
      acceleration,
      "PhysicsEngine.calculateForce input variable acceleration",
    );

    if (mass <= 0) {
      throw new RangeError(
        `PhysicsEngine.calculateForce.mass must be > 0. Received: ${mass}`,
      );
    }

    return this.multiply(mass, acceleration);
  }

  public static calculateNetForce(
    normalForce: number,
    gravitationalForce: number,
  ) {
    this.validateNumber(
      normalForce,
      "PhysicsEngine.calculateNetForce input variable normal force",
    );
    this.validateNumber(
      gravitationalForce,
      "PhysicsEngine.calculateNetForce input variable gravitational force",
    );
    return this.subtract(normalForce, gravitationalForce);
  }

  /** Returns the inward acceleration v²/r for circular motion. */
  public static calculateCentripetalAcceleration(
    speed: number,
    radius: number,
  ): number {
    this.validateNumber(
      speed,
      "PhysicsEngine.calculateCentripetalAcceleration input variable speed",
    );
    this.validateNumber(
      radius,
      "PhysicsEngine.calculateCentripetalAcceleration input variable radius",
    );
    if (speed < 0) {
      throw new RangeError(
        `PhysicsEngine.calculateCentripetalAcceleration.speed must be >= 0. Received: ${speed}`,
      );
    }
    if (radius <= 0) {
      throw new RangeError(
        `PhysicsEngine.calculateCentripetalAcceleration.radius must be > 0. Received: ${radius}`,
      );
    }

    // Divide before squaring to avoid overflowing on a large speed.
    const scaledSpeed = this.divide(speed, this.sqrt(radius));
    return this.multiply(scaledSpeed, scaledSpeed);
  }

  /** At the minimum speed, gravity alone supplies the inward acceleration. */
  public static calculateMinimumLoopSpeed(
    radius: number,
    gravitationalAcceleration: number,
  ): number {
    this.validateNumber(
      radius,
      "PhysicsEngine.calculateMinimumLoopSpeed input variable radius",
    );
    this.validateNumber(
      gravitationalAcceleration,
      "PhysicsEngine.calculateMinimumLoopSpeed input variable gravitational acceleration",
    );
    if (radius <= 0) {
      throw new RangeError(
        `PhysicsEngine.calculateMinimumLoopSpeed.radius must be > 0. Received: ${radius}`,
      );
    }
    if (gravitationalAcceleration < 0) {
      throw new RangeError(
        `PhysicsEngine.calculateMinimumLoopSpeed.gravitationalAcceleration must be >= 0. Received: ${gravitationalAcceleration}`,
      );
    }

    // Taking the roots first keeps sqrt(g * r) finite for large inputs.
    return this.multiply(
      this.sqrt(gravitationalAcceleration),
      this.sqrt(radius),
    );
  }
}
