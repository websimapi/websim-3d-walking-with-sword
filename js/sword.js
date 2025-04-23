// Sword.js - Sword generation, inventory, and effects
import * as THREE from 'three';
import { isControlLocked, setControlLock } from './controls.js';
import { camera } from './main.js';

// Sword variables
let sword = null;
let handOffset;
let swordGlowEffects;
let swordInventory = [];
let currentSwordIndex = -1;
let selectedSwordIndex = -1;

// Swing animation state variables
let isSwinging = false;
let swingProgress = 0;
let swingDirection = 1; // 1 for forward swing, -1 for returning
const swingDuration = 0.25; // Faster swing

// Initialize the sword system
export function initSwordSystem(camera, scene, controls) {
    // Create hand offset for sword positioning
    handOffset = new THREE.Object3D();
    camera.add(handOffset);
    handOffset.position.set(0.5, -0.4, -1);
    
    // Create container for sword glow effects
    swordGlowEffects = new THREE.Group();
    handOffset.add(swordGlowEffects);
    
    // Set up UI event listeners
    setupInventoryUI();
    
    // Set up sword animation
    setupSwordAnimation();
    
    // Generate initial sword
    generateNewSword();
}

// Set up the inventory UI
function setupInventoryUI() {
    // Get UI elements
    const inventoryContainer = document.getElementById('inventory-container');
    const regenerateBtn = document.getElementById('regenerate-btn');
    const regenerateInventoryBtn = document.getElementById('regenerate-inventory-btn');
    const equipButton = document.getElementById('equip-btn');
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    
    // Handle regenerate button click (in instructions)
    regenerateBtn.addEventListener('click', function() {
        toggleInventory(true);
        generateNewSword();
    });
    
    // Handle regenerate from inventory
    regenerateInventoryBtn.addEventListener('click', function() {
        generateNewSword();
    });
    
    // Handle equip button
    equipButton.addEventListener('click', function() {
        if (selectedSwordIndex >= 0 && selectedSwordIndex < swordInventory.length) {
            equipSword(selectedSwordIndex);
            toggleInventory(false);
        }
    });
    
    // Handle close inventory button
    closeInventoryBtn.addEventListener('click', function() {
        toggleInventory(false);
    });
}

// Toggle inventory visibility
export function toggleInventory(show) {
    const inventoryContainer = document.getElementById('inventory-container');
    if (show) {
        inventoryContainer.style.display = 'flex';
        updateInventoryUI();
    } else {
        inventoryContainer.style.display = 'none';
        setControlLock(true);
    }
}

// Set up sword animation
function setupSwordAnimation() {
    // Listen for swing events
    window.addEventListener('swordSwing', function() {
        if (!isSwinging) {
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
    
    // Animation update
    window.addEventListener('animate', function(e) {
        const delta = e.detail.delta;
        const clock = e.detail.clock;
        
        if (sword) {
            if (isSwinging) {
                // Update swing animation
                updateSwordSwing(delta, clock);
            } else {
                // Idle sword animation
                updateSwordIdle(clock);
            }
        }
    });
}

// Update sword swing animation
function updateSwordSwing(delta, clock) {
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
    // Base rotation values
    const baseRotZ = -Math.PI / 8 - Math.PI / 6; // 30 degrees left tilt
    const baseRotX = Math.PI / 6 + Math.PI;
    const baseRotY = Math.PI / 2;
    
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
}

// Update sword idle animation
function updateSwordIdle(clock) {
    // Idle sword animation - fixed rotation with slight movement
    sword.rotation.y = Math.PI / 2;
    sword.rotation.z = -Math.PI / 8 - Math.PI / 6 + Math.sin(clock.elapsedTime * 2) * 0.05;
    sword.rotation.x = Math.PI / 6 + Math.PI + Math.sin(clock.elapsedTime * 1.5) * 0.03;
    
    // Ensure emissive effect is off during idle
    if (sword && sword.material) {
        sword.material.emissiveIntensity = 0;
    }
}

// Generate new sword using AI
async function generateNewSword() {
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
            updateInventoryUI();
            selectSword(newIndex);
            
            // If this is the first sword, equip it immediately
            if (swordInventory.length === 1) {
                equipSword(0);
            }
            
            document.getElementById('loading').style.display = 'none';
        }
    } catch (error) {
        console.error("Error generating sword:", error);
        document.getElementById('loading').innerHTML = 'Error generating sword. Refresh to try again.';
    }
}

// Update the inventory UI with sword items
function updateInventoryUI() {
    const swordGridElement = document.getElementById('sword-grid');
    swordGridElement.innerHTML = '';
    
    swordInventory.forEach((sword, index) => {
        const swordItem = document.createElement('div');
        swordItem.className = 'sword-item';
        if (index === selectedSwordIndex) {
            swordItem.classList.add('selected');
        }
        
        const swordImg = document.createElement('img');
        swordImg.className = 'sword-preview';
        swordImg.src = sword.processedUrl;
        swordImg.alt = sword.name;
        
        const swordLabel = document.createElement('div');
        swordLabel.className = 'sword-label';
        swordLabel.textContent = sword.name;
        
        // Rename button
        const renameBtn = document.createElement('button');
        renameBtn.className = 'small-button';
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt('Enter new name for this sword:', sword.name);
            if (newName && newName.trim() !== '') {
                sword.name = newName.trim();
                updateInventoryUI();
            }
        });
        
        swordItem.appendChild(swordImg);
        swordItem.appendChild(swordLabel);
        swordItem.appendChild(renameBtn);
        
        swordItem.addEventListener('click', () => {
            selectSword(index);
        });
        
        swordGridElement.appendChild(swordItem);
    });
}

// Select a sword in the inventory
function selectSword(index) {
    selectedSwordIndex = index;
    updateInventoryUI();
}

// Equip a sword from the inventory
function equipSword(index) {
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
        isSwinging = false;
        swingProgress = 0;
        
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
        sword.rotation.y = Math.PI / 2;
        sword.rotation.z = -Math.PI / 8 - Math.PI / 6; // 30 degrees left tilt on Z axis
        sword.rotation.x = Math.PI / 6 + Math.PI; 
        
        // Enable shadow casting for the sword
        sword.castShadow = true;
        sword.receiveShadow = false;
        
        handOffset.add(sword);
        
        // Add sword glow effect
        addSwordGlowEffect();
    }
}

// Add a glow effect to the sword
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

// Function to remove background from sword image
function removeSwordBackground(img) {
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

// Utility function for smooth animation
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}