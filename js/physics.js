import * as THREE from 'three';
import { sword, swingState } from './sword.js';
import { scene } from './sceneSetup.js';

// Collection of physics objects
export const physicsObjects = [];

// Physics settings
const PUSH_FORCE = 15;
const GRAVITY = 9.8;
const FRICTION = 0.95;
const BOUNCE = 0.5;

// Setup physics for an object
export function addPhysicsToObject(object, mass = 1, isMovable = true) {
    // Skip if object already has physics
    if (object.userData.hasPhysics) return;
    
    // Create a physics body for the object
    object.userData.physics = {
        mass: mass,
        velocity: new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0),
        isMovable: isMovable,
        isOnGround: false,
        boundsType: 'sphere',
        boundingRadius: 0
    };
    
    // Calculate bounding radius based on geometry
    if (object.geometry) {
        object.geometry.computeBoundingSphere();
        object.userData.physics.boundingRadius = object.geometry.boundingSphere.radius * 
            Math.max(object.scale.x, object.scale.y, object.scale.z);
    }
    
    object.userData.hasPhysics = true;
    physicsObjects.push(object);
    
    return object;
}

// Create a bounding box for the sword during swing
export function createSwordCollider() {
    if (!sword) return null;
    
    // Create a simple bounding sphere for the sword
    const swordWorldPos = sword.getWorldPosition(new THREE.Vector3());
    const swordBounds = new THREE.Sphere(swordWorldPos, 0.5); // Sword collision radius
    
    return swordBounds;
}

// Check collision between sword and other objects
export function checkSwordCollisions() {
    if (!sword || !swingState.isSwinging) return;
    
    // Only check collisions during the forward part of the swing
    if (swingState.swingDirection === 1 && swingState.swingProgress > 0.2 && swingState.swingProgress < 0.8) {
        const swordBounds = createSwordCollider();
        if (!swordBounds) return;
        
        // Calculate sword velocity based on swing speed
        const swordVelocity = new THREE.Vector3(
            Math.sin(swingState.swingProgress * Math.PI) * 2,
            0,
            -Math.cos(swingState.swingProgress * Math.PI) * 2
        ).normalize().multiplyScalar(PUSH_FORCE);
        
        // Rotate velocity based on camera direction
        swordVelocity.applyQuaternion(sword.getWorldQuaternion(new THREE.Quaternion()));
        
        // Check collision with each physics object
        for (const object of physicsObjects) {
            if (!object.userData.physics.isMovable) continue;
            
            const objectPos = object.position.clone();
            const distance = objectPos.distanceTo(swordBounds.center);
            
            if (distance < swordBounds.radius + object.userData.physics.boundingRadius) {
                // Collision detected - apply force away from sword
                const pushDirection = objectPos.sub(swordBounds.center).normalize();
                const pushForce = pushDirection.multiplyScalar(PUSH_FORCE * object.userData.physics.mass / 10);
                
                // Add some random variation to make it look more natural
                pushForce.x += (Math.random() - 0.5) * 2;
                pushForce.z += (Math.random() - 0.5) * 2;
                
                // Apply the push force
                object.userData.physics.velocity.add(pushForce);
                
                // Add slight upward force for better visual effect
                object.userData.physics.velocity.y += 2 * object.userData.physics.mass;
                
                // Mark the object as not on the ground
                object.userData.physics.isOnGround = false;
            }
        }
    }
}

// Update physics for all objects
export function updatePhysics(deltaTime) {
    for (const object of physicsObjects) {
        const physics = object.userData.physics;
        
        // Skip non-movable objects
        if (!physics.isMovable) continue;
        
        // Apply gravity if not on ground
        if (!physics.isOnGround) {
            physics.velocity.y -= GRAVITY * deltaTime;
        }
        
        // Apply friction
        physics.velocity.x *= FRICTION;
        physics.velocity.z *= FRICTION;
        
        // Update position
        object.position.x += physics.velocity.x * deltaTime;
        object.position.y += physics.velocity.y * deltaTime;
        object.position.z += physics.velocity.z * deltaTime;
        
        // Ground collision check (simple ground at y=0)
        if (object.position.y < physics.boundingRadius) {
            object.position.y = physics.boundingRadius;
            // Bounce when hitting the ground
            if (physics.velocity.y < 0) {
                physics.velocity.y = -physics.velocity.y * BOUNCE;
                
                // If the bounce is very small, just stop
                if (Math.abs(physics.velocity.y) < 0.5) {
                    physics.velocity.y = 0;
                    physics.isOnGround = true;
                }
            }
        }
        
        // Add rotation based on movement
        if (physics.velocity.length() > 0.1) {
            // Add some rotation for fun
            object.rotation.x += physics.velocity.z * 0.1;
            object.rotation.z += physics.velocity.x * 0.1;
        }
    }
    
    // Check for sword collisions
    checkSwordCollisions();
}