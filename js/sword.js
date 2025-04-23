import * as THREE from 'three';
import { scene, camera } from './sceneSetup.js';
import { removeSwordBackground } from './utils.js';
import { checkSwordCollision } from './collision.js';

// Sword and hand positioning
export let handOffset = new THREE.Object3D();
export let sword = null;
export let swordGlowEffects = new THREE.Group();

// Sword inventory
export const swordInventory = [];
export let currentSwordIndex = -1;
export let selectedSwordIndex = -1;

// Sword collision state
export const swordCollisionState = {
    isColliding: false,
    collisionPoint: null,
    collisionNormal: null,
    originalPosition: new THREE.Vector3(),
    originalRotation: new THREE.Euler()
};

// Swing animation state
export const swingState = {
    isSwinging: false,
    swingProgress: 0,
    swingDirection: 1,
    swingDuration: 0.25,
    collisionBlocked: false
};

export function initSword(camera) {
    // Create hand offset for sword positioning
    camera.add(handOffset);
    handOffset.position.set(0.5, -0.4, -1); // Moved down by adjusting Y from -0.2 to -0.4
    
    // Add sword glow effects container
    handOffset.add(swordGlowEffects);
    
    // Connect the regenerate button to inventory system
    document.getElementById('regenerate-btn').addEventListener('click', function() {
        import('./inventory.js').then(module => {
            module.showInventory();
            generateNewSword();
        });
    });
}

export async function generateNewSword() {
    try {
        document.getElementById('loading').style.display = 'flex';
        
        const swordImage = await websim.imageGen({
            prompt: "A vertical fantasy sword standing upright with blade pointing up and handle at bottom, ornate metal handle at the bottom and shiny enchanted blade extending upward with blue magical runes, centered on pure blue background, full sword visible in frame",
            aspect_ratio: "1:1"
        });

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = swordImage.url;
        
        img.onload = function() {
            const transparentSwordUrl = removeSwordBackground(img);
            
            // Add to inventory with original and processed URLs
            const swordData = {
                originalUrl: swordImage.url,
                processedUrl: transparentSwordUrl,
                name: `Sword ${swordInventory.length + 1}`,
                timestamp: Date.now()
            };
            
            swordInventory.push(swordData);
            const newIndex = swordInventory.length - 1;
            
            // Update the inventory UI
            import('./inventory.js').then(module => {
                module.updateInventoryUI();
                module.selectSword(newIndex);
                
                // If this is the first sword, equip it immediately
                if (swordInventory.length === 1) {
                    equipSword(0);
                }
                
                document.getElementById('loading').style.display = 'none';
            });
        }
    } catch (error) {
        console.error("Error generating sword:", error);
        document.getElementById('loading').innerHTML = 'Error generating sword. Refresh to try again.';
    }
}

export function equipSword(index) {
    if (index >= 0 && index < swordInventory.length) {
        currentSwordIndex = index;
        
        // Remove existing sword and effects
        if (sword) {
            handOffset.remove(sword);
            sword = null;
        }
        
        // Clear existing glow effects
        while (swordGlowEffects.children.length > 0) {
            swordGlowEffects.remove(swordGlowEffects.children[0]);
        }
        
        // Reset swing state
        swingState.isSwinging = false;
        swingState.swingProgress = 0;
        swingState.collisionBlocked = false;
        
        // Create the sword with the selected texture
        const swordTexture = new THREE.TextureLoader().load(swordInventory[index].processedUrl);
        swordTexture.flipY = false;
        
        // Enhanced sword material with stronger emissive glow
        const swordMaterial = new THREE.MeshStandardMaterial({ 
            map: swordTexture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.5,
            emissive: 0x4466ff,
            emissiveIntensity: 0, // Start with no glow
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1.5
        });
        
        // Create a slightly thicker plane for better shadow casting
        const swordGeometry = new THREE.PlaneGeometry(1, 1);
        sword = new THREE.Mesh(swordGeometry, swordMaterial);
        
        // Set up sword positioning - fixed rotation for correct leftward angle
        sword.rotation.y = Math.PI / 2; // Reverted to original rotation
        sword.rotation.z = -Math.PI / 8 - Math.PI / 6; // Added 30 degrees left tilt on Z axis
        sword.rotation.x = Math.PI / 6 + Math.PI; 
        
        // Enable shadow casting for the sword
        sword.castShadow = true;
        sword.receiveShadow = false;
        
        handOffset.add(sword);
        
        // Store original position and rotation for collision detection
        swordCollisionState.originalPosition.copy(sword.position);
        swordCollisionState.originalRotation.copy(sword.rotation);
        
        // Add sword glow effect
        addSwordGlowEffect();
    }
}

export function handleSwordSwing() {
    if (!swingState.isSwinging) {
        swingState.isSwinging = true;
        swingState.swingProgress = 0;
        swingState.swingDirection = 1; // Start with forward swing
        swingState.collisionBlocked = false;
        
        // Reset collision state
        swordCollisionState.isColliding = false;
        swordCollisionState.collisionPoint = null;
        
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
}

// Function to check sword collision during swing
export function checkSwordCollisionInSwing() {
    if (!sword || !swingState.isSwinging) return false;
    
    // Get swing direction vector (perpendicular to sword plane in its current rotation)
    const swingDirection = new THREE.Vector3(0, 0, 1);
    swingDirection.applyQuaternion(sword.getWorldQuaternion(new THREE.Quaternion()));
    
    // Check for collision with scene objects
    const collision = checkSwordCollision(sword, swingDirection);
    
    // If we have a collision and weren't blocked before
    if (collision.collided && !swingState.collisionBlocked) {
        swordCollisionState.isColliding = true;
        swordCollisionState.collisionPoint = collision.point;
        swordCollisionState.collisionNormal = collision.normal;
        swingState.collisionBlocked = true;
        
        // Create a small spark effect at the collision point
        createCollisionEffect(collision.point);
        
        return true;
    }
    
    return false;
}

// Function to create a glow effect around the sword
function addSwordGlowEffect() {
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

// Create visual effect when sword collides with something
function createCollisionEffect(point) {
    // Spark particles using points
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = [];
    const sparkCount = 15;
    
    for (let i = 0; i < sparkCount; i++) {
        const spread = 0.1;
        sparkPositions.push(
            point.x + (Math.random() - 0.5) * spread,
            point.y + (Math.random() - 0.5) * spread,
            point.z + (Math.random() - 0.5) * spread
        );
    }
    
    sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sparkPositions, 3));
    
    const sparkMaterial = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.03,
        transparent: true,
        opacity: 1.0
    });
    
    const sparks = new THREE.Points(sparkGeo, sparkMaterial);
    scene.add(sparks);
    
    // Add a flash light at collision point
    const flashLight = new THREE.PointLight(0x44aaff, 2, 2);
    flashLight.position.copy(point);
    scene.add(flashLight);
    
    // Remove particles and light after animation
    const duration = 500; // ms
    setTimeout(() => {
        scene.remove(sparks);
        scene.remove(flashLight);
    }, duration);
    
    // Add a tiny sound effect if Web Audio API is available
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        // Audio not supported, ignore
    }
}

// Add this setter function to properly update the selectedSwordIndex
export function setSelectedSwordIndex(index) {
    selectedSwordIndex = index;
}