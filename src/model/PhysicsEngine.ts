export class PhysicsEngine {
    public static calculateVelocity(displacement: number, time: number) {
        return displacement / time;
    }

    public static calculateDisplacement(velocity: number, time: number) {
        return velocity * time;
    }
}