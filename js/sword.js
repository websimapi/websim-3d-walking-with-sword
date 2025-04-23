import * as THREE from 'three';
import { scene, camera } from './sceneSetup.js';
import { removeSwordBackground } from './utils.js';
import { room, isDesktop } from './multiplayer.js';

// Sword and hand positioning
export let handOffset = new THREE.Object3D();
export let sword = null;
export let swordGlowEffects = new THREE.Group();

// Sword inventory
export const swordInventory = [];
export let currentSwordIndex = -1;
export let selectedSwordIndex = -1;

// Swing animation state
export const swingState = {
    isSwinging: false,
    swingProgress: 0,
    swingDirection: 1,
    swingDuration: 0.25
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
    
    // Add listener for remote sword swing requests
    if (room) {
        room.subscribePresenceUpdateRequests((updateRequest, fromClientId) => {
            if (updateRequest.type === 'swordSwingTrigger') {
                handleSwordSwing(updateRequest.intensity);
                
                // Broadcast swing event to all players
                room.send({
                    type: 'swordSwing',
                    clientId: room.clientId,
                    username: room.peers[room.clientId]?.username || 'Unknown Player',
                    intensity: updateRequest.intensity || 1
                });
            }
        });
    }
}

export async function generateNewSword() {
    try {
        document.getElementById('loading').style.display = 'flex';
        
        // Enhanced detailed prompt for better background removal
        const swordImage = await websim.imageGen({
            prompt: `Create a high-contrast fantasy sword image with these EXACT specifications:

- BACKGROUND: Perfect solid #0000FF blue background (RGB 0,0,255) with absolutely NO gradients, NO texture, NO shading, and NO variations
- POSITIONING: Sword perfectly centered, standing completely vertical with blade pointing straight up
- COMPOSITION: Full sword visible in frame with small margin around all edges, no cropping
- SWORD DETAILS: 
  * Ornate metal handle at bottom (25% of total length)
  * Shiny enchanted blade extending upward (75% of total length)
  * Blue magical runes or symbols embedded in blade
  * High contrast between sword and background
  * Clear, defined edges with no blur between sword and background
- LIGHTING: Even lighting on sword with minimal shadows
- STYLE: Clean, detailed render with crisp edges
- ISOLATION: Absolutely NO elements besides the sword and solid blue background

The sword must appear as if it was photographed against a perfectly flat blue screen with sharp delineation between sword and background.`,
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
        
        // Add sword glow effect
        addSwordGlowEffect();
        
        // Update multiplayer state to show the equipped sword
        if (room && isDesktop) {
            room.updatePresence({
                equippedSword: {
                    index: index,
                    name: swordInventory[index].name
                }
            });
        }
    }
}

export function handleSwordSwing(intensity = 1) {
    if (!swingState.isSwinging) {
        swingState.isSwinging = true;
        swingState.swingProgress = 0;
        swingState.swingDirection = 1; // Start with forward swing
        
        // Adjust swing duration based on intensity (if provided by mobile device)
        if (intensity > 1) {
            // Faster swing for stronger intensity (but not too fast)
            swingState.swingDuration = Math.max(0.15, 0.25 - (intensity * 0.005));
        } else {
            swingState.swingDuration = 0.25; // Default duration
        }
        
        // Enable sword glow effects during swing
        swordGlowEffects.children.forEach(light => {
            light.visible = true;
        });
        
        // Enable emissive effect if sword exists
        if (sword && sword.material) {
            sword.material.emissive = new THREE.Color(0x4466ff);
            sword.material.emissiveIntensity = 0.8;
        }
        
        // Send sword swing message to other players if this wasn't triggered by a mobile device
        if (room && isDesktop) {
            room.send({
                type: 'swordSwing',
                clientId: room.clientId,
                username: room.peers[room.clientId]?.username || 'Unknown Player',
                intensity: intensity
            });
        }
    }
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

// Add this setter function to properly update the selectedSwordIndex
export function setSelectedSwordIndex(index) {
    selectedSwordIndex = index;
}