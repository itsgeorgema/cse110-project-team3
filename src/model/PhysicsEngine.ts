export class PhysicsEngine {
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

    public static subtract(a: number, b: number): number {
        this.validateNumber(a, "PhysicsEngine.subtract input variable a");
        this.validateNumber(b, "PhysicsEngine.subtract input variable b");

        return this.validateResult(a - b, "PhysicsEngine.subtract");
    }

    public static calculateAcceleration(initialVelocity: number, finalVelocity: number, time: number) {
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
}
