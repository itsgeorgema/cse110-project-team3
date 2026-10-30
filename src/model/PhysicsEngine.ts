export class PhysicsEngine {
    public static calculateVelocity(displacement: number, time: number) {
        return displacement / time;
    }

    public static calculateDisplacement(velocity: number, time: number) {
        return velocity * time;
    }

    public static calculateAcceleration(initVelocity: number, finalVelocity: number, time: number){
        return (finalVelocity - initVelocity) / time;
    }

    public static calculateGravity(mass: number, gravitationalAcceleration: number = 9.81){
        return mass * gravitationalAcceleration; //prepare for Minigame 2, Level 2
    }

    public static calculateNormalForce(mass: number, gravitationalAcceleration: 9.81){
        return mass * gravitationalAcceleration; //prepare for Minigame 2, Level 2
    }

    public static calculateNetForceDirectlyOpposingForces(normalForce: number, gravitationalForce: number){
        return normalForce - gravitationalForce; //prepare for Minigame 2, Level 2
    }
}