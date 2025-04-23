import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { controls } from './controls.js';
import { easeInOutQuad, clock } from './utils.js';

// Sword state
export let sword = null;
export let handOffset = null;
export let swordGlowEffects = null;

// Swing animation state
export let isSwinging = false;
export let swingProgress = 0;
export let swingDirection = 1;
const swingDuration = 0.25;

// Initialize sword system
export function initSwordSystem(camera) {
    // Create hand offset for sword positioning
    handOffset = new THREE.Object3D();
    camera.add(handOffset);
    handOffset.position.set(0.5, -0.4, -1);
    
    // Sword glow container
    swordGlowEffects = new THREE.Group();
    handOffset.add(swordGlowEffects);
    
    // Register mouse click for sword swinging
    document.addEventListener('mousedown', function(event) {
        // Left mouse button (button 0)
        if (event.button === 0 && !isSwinging && controls.isLocked) {
            isSwinging = true;
            swingProgress = 0;
            swingDirection = 1; // Start with forward swing
            
            // Enable sword glow effects during swing
            swordGlowEffects.children.forEach(light => {
                light.visible = true;
            });
            
            // Enable emissive effect if sword exists
            if (sword && sword.material) {
                sword.material.emissive = new THREE.Color(0x4466ff);
                sword.material.emissiveIntensity = 0.8;
            }
        }
    });
}

// Update sword animation
export function updateSwordAnimation(delta) {
    if (sword) {
        if (isSwinging) {
            // Update swing progress
            swingProgress += delta * swingDirection / swingDuration;
            
            if (swingDirection === 1 && swingProgress >= 1) {
                // Switch to return swing
                swingProgress = 1;
                swingDirection = -1;
            } else if (swingDirection === -1 && swingProgress <= 0) {
                // End swing animation
                swingProgress = 0;
                isSwinging = false;
                
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
            // Base rotation values - with corrected leftward tilt
            const baseRotZ = -Math.PI / 8 - Math.PI / 6; // Corrected 30 degrees left tilt
            const baseRotX = Math.PI / 6 + Math.PI;
            const baseRotY = Math.PI / 2; // Reverted to original Y rotation
            
            // Swing animation curve (ease in-out)
            const curve = swingDirection === 1 ? 
                easeInOutQuad(swingProgress) : 
                1 - easeInOutQuad(1 - swingProgress);
            
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
            sword.rotation.z = -Math.PI / 8 - Math.PI / 6 + Math.sin(clock.elapsedTime * 2) * 0.05; // Corrected Z rotation with left tilt
            sword.rotation.x = Math.PI / 6 + Math.PI + Math.sin(clock.elapsedTime * 1.5) * 0.03;
            
            // Ensure emissive effect is off during idle
            if (sword && sword.material) {
                sword.material.emissiveIntensity = 0;
            }
        }
    }
}

// Create sword glow effect 
export function addSwordGlowEffect() {
    // Add a subtle blue light at the sword's position
    const swordPointLight = new THREE.PointLight(0x3366ff, 2, 2);
    swordPointLight.position.set(0, 0, 0);
    swordPointLight.visible = false; // Start with lights off
    swordGlowEffects.add(swordPointLight);
    
    // Add a second light for additional glow effect
    const secondGlowLight = new THREE.PointLight(0x00aaff, 1.5, 1.5);
    secondGlowLight.position.set(0, 0.2, 0);
    secondGlowLight.visible = false; // Start with lights off
    swordGlowEffects.add(secondGlowLight);
}

// Function to remove background from sword image
export function removeSwordBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Sample multiple corner points to better identify the background color
    const sampleSize = 5; // Number of pixels to sample from each corner
    const backgroundSamples = [];
    
    // Sample top-left corner
    for (let y = 0; y < sampleSize; y++) {
        for (let x = 0; x < sampleSize; x++) {
            const index = (y * canvas.width + x) * 4;
            backgroundSamples.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    // Sample top-right corner
    for (let y = 0; y < sampleSize; y++) {
        for (let x = canvas.width - sampleSize; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            backgroundSamples.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    // Sample bottom-left corner
    for (let y = canvas.height - sampleSize; y < canvas.height; y++) {
        for (let x = 0; x < sampleSize; x++) {
            const index = (y * canvas.width + x) * 4;
            backgroundSamples.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    // Sample bottom-right corner
    for (let y = canvas.height - sampleSize; y < canvas.height; y++) {
        for (let x = canvas.width - sampleSize; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            backgroundSamples.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    // Calculate the average background color
    const avgBackground = backgroundSamples.reduce(
        (acc, curr) => {
            acc.r += curr.r;
            acc.g += curr.g;
            acc.b += curr.b;
            return acc;
        },
        { r: 0, g: 0, b: 0 }
    );
    
    avgBackground.r /= backgroundSamples.length;
    avgBackground.g /= backgroundSamples.length;
    avgBackground.b /= backgroundSamples.length;
    
    // Calculate standard deviation to determine a dynamic tolerance
    const stdDev = backgroundSamples.reduce(
        (acc, curr) => {
            acc.r += Math.pow(curr.r - avgBackground.r, 2);
            acc.g += Math.pow(curr.g - avgBackground.g, 2);
            acc.b += Math.pow(curr.b - avgBackground.b, 2);
            return acc;
        },
        { r: 0, g: 0, b: 0 }
    );
    
    stdDev.r = Math.sqrt(stdDev.r / backgroundSamples.length);
    stdDev.g = Math.sqrt(stdDev.g / backgroundSamples.length);
    stdDev.b = Math.sqrt(stdDev.b / backgroundSamples.length);
    
    // Base tolerance on the standard deviation, with a minimum value
    const baseTolerance = 30;
    const dynamicTolerance = Math.max(
        baseTolerance,
        (stdDev.r + stdDev.g + stdDev.b) / 3 * 2
    );
    
    // Keep track of center coordinates for distance-based weighting
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    
    // Process pixels with position-aware algorithm
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Calculate color distance from background
            const colorDist = Math.sqrt(
                Math.pow(r - avgBackground.r, 2) +
                Math.pow(g - avgBackground.g, 2) +
                Math.pow(b - avgBackground.b, 2)
            );
            
            // Calculate physical distance from center (normalized to 0-1)
            const distFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + 
                Math.pow(y - centerY, 2)
            ) / maxDistance;
            
            // Adjust tolerance based on distance from center
            // Pixels closer to the center get a lower tolerance (are more likely to be kept)
            const adjustedTolerance = dynamicTolerance * (0.7 + 0.3 * distFromCenter);
            
            // If color is close to background and not too blue (to preserve sword runes)
            if (colorDist < adjustedTolerance && b < 200) {
                // Make more transparent the closer it is to the background color
                // This creates a smoother edge
                const alpha = Math.max(0, Math.min(255, (colorDist / adjustedTolerance) * 255));
                data[index + 3] = alpha;
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}