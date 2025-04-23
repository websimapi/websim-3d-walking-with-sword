import * as THREE from 'three';
import { controls } from './controls.js';
import { 
    sword, 
    handOffset, 
    swordGlowEffects, 
    isSwinging,
    swingProgress, 
    addSwordGlowEffect, 
    removeSwordBackground 
} from './sword.js';

// Inventory state
export const swordInventory = [];
export let currentSwordIndex = -1;
export let selectedSwordIndex = -1;

// Initialize inventory
export function initInventory(controls) {
    // UI elements
    const regenerateBtn = document.getElementById('regenerate-btn');
    const regenerateInventoryBtn = document.getElementById('regenerate-inventory-btn');
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    const equipButton = document.getElementById('equip-btn');
    
    // Handle regenerate button click - now directly in inventory
    regenerateBtn.addEventListener('click', function() {
        showInventory();
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
            closeInventory();
        }
    });
    
    // Handle close inventory button
    closeInventoryBtn.addEventListener('click', closeInventory);
    
    // Generate first sword and start inventory
    generateNewSword();
}

// Show inventory UI
export function showInventory() {
    document.getElementById('instructions').style.display = 'none';
    document.getElementById('inventory-container').style.display = 'flex';
    updateInventoryUI();
}

// Close inventory
export function closeInventory() {
    document.getElementById('inventory-container').style.display = 'none';
    // Re-lock controls when closing inventory
    controls.lock();
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
        sword.rotation.z = -Math.PI / 8 - Math.PI / 6; // Added 30 degrees left tilt on Z axis
        sword.rotation.x = Math.PI / 6 + Math.PI; 
        
        // Enable shadow casting for the sword
        sword.castShadow = true;
        sword.receiveShadow = false;
        
        handOffset.add(sword);
        
        // Add sword glow effect without particles
        addSwordGlowEffect();
    }
}

// Generate sword using AI and add to inventory
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