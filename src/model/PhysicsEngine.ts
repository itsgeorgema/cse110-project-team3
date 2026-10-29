export class PhysicsEngine {
    public static calculateVelocity(displacement: number, time: number) {
        return displacement / time;
    }

    public static calculateDisplacement(velocity: number, time: number) {
        return velocity * time;
    }

    public static calculateAcceleration(initVelocity: number, finalVelocity: number, initTime: number, finalTime: number){
        return (finalVelocity - initVelocity) / (finalTime - initTime);
    }
}