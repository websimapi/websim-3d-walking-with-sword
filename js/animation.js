import * as THREE from 'three';
import { composer, scene, camera } from './sceneSetup.js';
import { controls, movementState } from './controls.js';
import { sword, handOffset, swordGlowEffects, swingState, arm } from './sword.js';

// Animation clock
const clock = new THREE.Clock();

export function setupAnimationLoop() {
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Movement code
    updateMovement(delta);
    
    // Handle sword animation
    updateSwordAnimation(delta);
    
    // Use composer instead of renderer
    composer.render();
}

function updateMovement(delta) {
    movementState.velocity.x -= movementState.velocity.x * 10.0 * delta;
    movementState.velocity.z -= movementState.velocity.z * 10.0 * delta;
    
    movementState.direction.z = Number(movementState.moveForward) - Number(movementState.moveBackward);
    movementState.direction.x = Number(movementState.moveRight) - Number(movementState.moveLeft);
    movementState.direction.normalize();
    
    if (movementState.moveForward || movementState.moveBackward) 
        movementState.velocity.z -= movementState.direction.z * 20.0 * delta;
    if (movementState.moveLeft || movementState.moveRight) 
        movementState.velocity.x -= movementState.direction.x * 20.0 * delta;
    
    controls.moveRight(-movementState.velocity.x * delta);
    controls.moveForward(-movementState.velocity.z * delta);
}

function updateSwordAnimation(delta) {
    if (sword) {
        if (swingState.isSwinging) {
            // Update swing progress
            swingState.swingProgress += delta * swingState.swingDirection / swingState.swingDuration;
            
            if (swingState.swingDirection === 1 && swingState.swingProgress >= 1) {
                // Switch to return swing
                swingState.swingProgress = 1;
                swingState.swingDirection = -1;
            } else if (swingState.swingDirection === -1 && swingState.swingProgress <= 0) {
                // End swing animation
                swingState.swingProgress = 0;
                swingState.isSwinging = false;
                
                // Disable sword glow effects
                swordGlowEffects.children.forEach(light => {
                    light.visible = false;
                });
                
                // Disable emissive effect when not swinging
                if (sword.material) {
                    sword.material.emissiveIntensity = 0;
                }
            }
            
            // Calculate swing animation
            // Base rotation values - updated with corrected leftward tilt
            const baseRotZ = -Math.PI / 8 - Math.PI / 6; // Corrected 30 degrees left tilt
            const baseRotX = Math.PI / 6 + Math.PI;
            const baseRotY = Math.PI / 2; // Reverted to original Y rotation
            
            // Swing animation curve (ease in-out)
            const curve = swingState.swingDirection === 1 ? 
                easeInOutQuad(swingState.swingProgress) : 
                1 - easeInOutQuad(1 - swingState.swingProgress);
            
            // Apply swing animation 
            sword.rotation.z = baseRotZ - curve * 1.5; 
            sword.rotation.x = baseRotX + curve * 1.0; 
            sword.rotation.y = baseRotY;
            
            // Animate glow intensity based on swing
            if (sword.material) {
                sword.material.emissiveIntensity = 0.8 + curve * 0.7;
            }
            
            // Animate lights during swing
            if (swordGlowEffects && swordGlowEffects.children.length > 0) {
                for (let i = 0; i < swordGlowEffects.children.length; i++) {
                    const glowEffect = swordGlowEffects.children[i];
                    if (glowEffect.type === 'PointLight') {
                        // Stronger light during the peak of the swing
                        glowEffect.intensity = 1.5 + curve * 1.5;
                    }
                }
            }
        } else {
            // Idle sword animation - fixed rotation
            sword.rotation.y = Math.PI / 2; // Reverted to original rotation
            sword.rotation.z = -Math.PI / 8 - Math.PI / 6 + Math.sin(clock.elapsedTime * 2) * 0.05; // Corrected Z rotation with 30 degrees left tilt
            sword.rotation.x = Math.PI / 6 + Math.PI + Math.sin(clock.elapsedTime * 1.5) * 0.03;
            
            // Ensure emissive effect is off during idle
            if (sword && sword.material) {
                sword.material.emissiveIntensity = 0;
            }
        }
    } else if (arm) {
        // Idle arm animation when no sword is equipped
        arm.rotation.y = Math.PI / 2; 
        arm.rotation.z = -Math.PI / 8 - Math.PI / 6 + Math.sin(clock.elapsedTime * 1.5) * 0.03;
        arm.rotation.x = Math.PI / 6 + Math.PI + Math.sin(clock.elapsedTime) * 0.02;
    }
}

// Easing function for smooth animation
export function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}