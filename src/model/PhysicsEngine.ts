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

  // Addition
  public static add(a: number, b: number): number {
    this.validateNumber(a, "PhysicsEngine.add input variable a");
    this.validateNumber(b, "PhysicsEngine.add input variable b");

    return this.validateResult(a + b, "PhysicsEngine.add");
  }

  // Subtraction
  public static subtract(a: number, b: number): number {
    this.validateNumber(a, "PhysicsEngine.subtract input variable a");
    this.validateNumber(b, "PhysicsEngine.subtract input variable b");

    return this.validateResult(a - b, "PhysicsEngine.subtract");
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

  // Square root
  public static sqrt(a: number): number {
    this.validateNumber(a, "PhysicsEngine.sqrt input variable a");

    if (a < 0) {
      throw new RangeError(
        `PhysicsEngine.sqrt: Cannot calculate the real square root of a ` +
        `negative number. Received input variable a: ${a}`
      );
    }

    return this.validateResult(Math.sqrt(a),"PhysicsEngine.sqrt");
  }

  // Sine (input in radians)
  public static sin(angle: number): number {
    this.validateNumber(angle, "PhysicsEngine.sin input Angle");

    return this.validateResult(Math.sin(angle), "PhysicsEngine.sin");
  }

  // Cosine (input in radians)
  public static cos(angle: number): number {
    this.validateNumber(angle, "PhysicsEngine.cos input Angle");

    return this.validateResult(Math.cos(angle), "PhysicsEngine.cos");
  }

  public static calculateVelocity(displacement: number, time: number) {
    this.validateNumber(displacement, "PhysicsEngine.calculateVelocity input variable displacement");
    this.validateNumber(time, "PhysicsEngine.calculateVelocity input variable time");
    if (time <= 0) {
      throw new RangeError(`PhysicsEngine.calculateVelocity.time must be positive. Received: ${time}`);
    }

    return this.divide(displacement, time);
  }

  public static calculateDisplacement(velocity: number, time: number) {
    this.validateNumber(velocity, "PhysicsEngine.calculateVelocity input variable velocity");
    this.validateNumber(time, "PhysicsEngine.calculateVelocity input variable time");
    if (time < 0) {
      throw new RangeError(`PhysicsEngine.calculateDisplacement.time must be >= 0. Received: ${time}`);
    }

    return this.multiply(velocity, time);
  }
}