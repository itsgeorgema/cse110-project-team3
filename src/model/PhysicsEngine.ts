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

  public static calculateHorizontalLaunchVelocity(
    speed: number,
    angleDegrees: number,
  ): number {
    this.validateNumber(
      speed,
      "PhysicsEngine.calculateHorizontalLaunchVelocity input variable speed",
    );
    this.validateNumber(
      angleDegrees,
      "PhysicsEngine.calculateHorizontalLaunchVelocity input variable angle",
    );

    if (speed <= 0) {
      throw new RangeError(
        `PhysicsEngine.calculateHorizontalLaunchVelocity.speed must be > 0. Received: ${speed}`,
      );
    }
    if (angleDegrees < 0 || angleDegrees > 90) {
      throw new RangeError(
        `PhysicsEngine.calculateHorizontalLaunchVelocity.angle must be between 0 and 90 degrees. Received: ${angleDegrees}`,
      );
    }
    const angleRadians = this.divide(this.multiply(angleDegrees, Math.PI), 180);
    return this.multiply(speed, Math.cos(angleRadians));
  }

  public static calculateVerticalLaunchVelocity(
    speed: number,
    angleDegrees: number,
  ): number {
    this.validateNumber(
      speed,
      "PhysicsEngine.calculateVerticalLaunchVelocity input variable speed",
    );
    this.validateNumber(
      angleDegrees,
      "PhysicsEngine.calculateVerticalLaunchVelocity input variable angle",
    );

    if (speed <= 0) {
      throw new RangeError(
        `PhysicsEngine.calculateVerticalLaunchVelocity.speed must be > 0. Received: ${speed}`,
      );
    }
    if (angleDegrees < 0 || angleDegrees > 90) {
      throw new RangeError(
        `PhysicsEngine.calculateVerticalLaunchVelocity.angle must be between 0 and 90 degrees. Received: ${angleDegrees}`,
      );
    }
    const angleRadians = this.divide(this.multiply(angleDegrees, Math.PI), 180);
    return this.multiply(speed, Math.sin(angleRadians));
  }

  /** Returns the initial speed in m/s for a 45-degree launch to a target at or above launch height. */
  public static calculateLaunchSpeedAt45Degrees(
    horizontalDistance: number,
    targetHeight: number,
    gravitationalAcceleration: number,
  ): number {
    const operation = "PhysicsEngine.calculateLaunchSpeedAt45Degrees";
    this.validateNumber(
      horizontalDistance,
      `${operation} input variable horizontal distance`,
    );
    this.validateNumber(
      targetHeight,
      `${operation} input variable target height`,
    );
    this.validateNumber(
      gravitationalAcceleration,
      `${operation} input variable gravitational acceleration`,
    );

    if (horizontalDistance <= 0) {
      throw new RangeError(
        `${operation}.horizontalDistance must be > 0. Received: ${horizontalDistance}`,
      );
    }
    if (targetHeight < 0 || targetHeight >= horizontalDistance) {
      throw new RangeError(
        `${operation}.targetHeight must be >= 0 and less than horizontalDistance. Received: ${targetHeight}`,
      );
    }
    if (gravitationalAcceleration <= 0) {
      throw new RangeError(
        `${operation}.gravitationalAcceleration must be > 0. Received: ${gravitationalAcceleration}`,
      );
    }

    // Eliminating time gives v = x * sqrt(g / (x - y)) at 45 degrees.
    const dropFromLaunchLine = this.subtract(horizontalDistance, targetHeight);
    return this.multiply(
      this.divide(horizontalDistance, this.sqrt(dropFromLaunchLine)),
      this.sqrt(gravitationalAcceleration),
    );
  }

  /**
   * Returns the track's normal force on a coaster at the top of a loop,
   * taking the direction toward the center (down) as positive.
   * Gravity and the normal force both point toward the center, so
   * F_N = m * v^2 / r - m * g. A negative result means the coaster would
   * leave the track, so it is rejected.
   */
  public static calculateNormalForceAtLoopTop(
    mass: number,
    speed: number,
    radius: number,
    gravitationalAcceleration: number,
  ): number {
    this.validateNumber(
      gravitationalAcceleration,
      "PhysicsEngine.calculateNormalForceAtLoopTop input variable gravitational acceleration",
    );
    if (gravitationalAcceleration < 0) {
      throw new RangeError(
        `PhysicsEngine.calculateNormalForceAtLoopTop.gravitationalAcceleration must be >= 0. Received: ${gravitationalAcceleration}`,
      );
    }

    // calculateCentripetalAcceleration and calculateForce validate
    // speed, radius, and mass.
    const netForce = this.calculateForce(
      mass,
      this.calculateCentripetalAcceleration(speed, radius),
    );
    const gravitationalForce = this.calculateForce(
      mass,
      gravitationalAcceleration,
    );
    const normalForce = this.subtract(netForce, gravitationalForce);

    if (normalForce < 0) {
      throw new RangeError(
        `PhysicsEngine.calculateNormalForceAtLoopTop: speed ${speed} m/s is too slow to stay on a loop of radius ${radius} m.`,
      );
    }

    return normalForce;
  }
}
