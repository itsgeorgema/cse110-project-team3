export class PhysicsEngine {
    public static calculateVelocity(displacement: number, time: number) {
        if (time === 0) {
            throw new Error("Division by 0: cannot calculate velocity if time is 0");
        }
        return displacement / time;
    }

    public static calculateDisplacement(velocity: number, time: number) {
        return velocity * time;
    }
}