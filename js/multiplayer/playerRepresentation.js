import * as THREE from 'three';
import { scene, camera } from '../sceneSetup.js';
import { room, pairedClientId } from './core.js';
import { isDesktop } from './deviceDetection.js';
import { sword } from '../sword.js';
import { showPairingStatus } from './ui.js';

export const playerEntities = {};

// Handle presence updates
export function handlePresenceUpdate(allPresence) {
    if (isDesktop) {
        updatePlayerRepresentations(allPresence);
        
        // If we have a paired mobile device, check for updates
        if (pairedClientId && allPresence[pairedClientId]) {
            const mobileData = allPresence[pairedClientId];
            applySwordOrientationFromMobile(mobileData);
        }
    }
    
    // If we're mobile and paired, we don't need to do anything special here
    // since we're continuously sending updates via the motion sensors
}

// Initialize visible representations of other players
export function initPlayerRepresentations() {
    // Create representations for all existing players
    for (const clientId in room.presence) {
        if (clientId !== room.clientId) {
            createPlayerRepresentation(clientId, room.presence[clientId]);
        }
    }
}

// Create 3D representation of a player
export function createPlayerRepresentation(clientId, presenceData) {
    // Only create representations for desktop players (full players)
    if (presenceData.type !== 'desktop') return;
    
    // Check if representation already exists
    if (playerEntities[clientId]) return;
    
    // Create a simple representation of the player
    const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const playerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x44aaff,
        roughness: 0.7,
        metalness: 0.3
    });
    const playerMesh = new THREE.Group();
    
    // Body
    const body = new THREE.Mesh(playerGeometry, playerMaterial);
    body.position.y = 1;
    playerMesh.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const head = new THREE.Mesh(headGeometry, playerMaterial);
    head.position.y = 2;
    playerMesh.add(head);
    
    // Create a name tag above the player
    const username = room.peers[clientId]?.username || 'Unknown Player';
    createPlayerNameTag(playerMesh, username);
    
    // Add the player's sword
    createPlayerSword(playerMesh);
    
    // Position the player
    const pos = presenceData.position || { x: 0, y: 0, z: 0 };
    playerMesh.position.set(pos.x, pos.y, pos.z);
    
    // Store and add to scene
    playerEntities[clientId] = playerMesh;
    scene.add(playerMesh);
}

// Create a name tag for a player
function createPlayerNameTag(playerMesh, username) {
    // Create a canvas for the name tag
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw the name tag background
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the name text
    context.font = '28px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(username, canvas.width / 2, canvas.height / 2 + 10);
    
    // Create a texture from the canvas
    const nameTexture = new THREE.CanvasTexture(canvas);
    const nameMaterial = new THREE.MeshBasicMaterial({
        map: nameTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create a plane to display the name tag
    const nameGeometry = new THREE.PlaneGeometry(1, 0.25);
    const nameMesh = new THREE.Mesh(nameGeometry, nameMaterial);
    nameMesh.position.y = 2.5;
    
    // Make the name tag always face the camera
    nameMesh.userData.isBillboard = true;
    
    playerMesh.add(nameMesh);
}

// Create a sword for a player representation
function createPlayerSword(playerMesh) {
    // Simple sword geometry (placeholder)
    const swordGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    const swordMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xaaaaaa,
        roughness: 0.3,
        metalness: 0.8
    });
    const remoteSword = new THREE.Mesh(swordGeometry, swordMaterial);
    
    // Position the sword to the right of the player
    remoteSword.position.set(0.5, 1.2, -0.3);
    remoteSword.rotation.z = Math.PI / 4;
    
    playerMesh.add(remoteSword);
    playerMesh.userData.sword = remoteSword;
}

// Update player representations based on presence data
function updatePlayerRepresentations(allPresence) {
    // Process all presence data to create/update player representations
    for (const clientId in allPresence) {
        const presenceData = allPresence[clientId];
        
        // Skip ourselves
        if (clientId === room.clientId) continue;
        
        // Only update desktop players (actual player characters)
        if (presenceData.type === 'desktop') {
            // Create player representation if it doesn't exist
            if (!playerEntities[clientId]) {
                createPlayerRepresentation(clientId, presenceData);
            }
            
            // Update player position
            if (playerEntities[clientId] && presenceData.position) {
                playerEntities[clientId].position.x = presenceData.position.x;
                playerEntities[clientId].position.y = presenceData.position.y;
                playerEntities[clientId].position.z = presenceData.position.z;
            }
            
            // Update player rotation
            if (playerEntities[clientId] && presenceData.rotation) {
                playerEntities[clientId].rotation.y = presenceData.rotation.y;
            }
        }
    }
    
    // Remove representations for players that are no longer present
    for (const clientId in playerEntities) {
        if (!allPresence[clientId]) {
            scene.remove(playerEntities[clientId]);
            delete playerEntities[clientId];
        }
    }
}

// Apply mobile gyroscope data to desktop sword orientation
export function applySwordOrientationFromMobile(mobileData) {
    if (!sword) return;
    
    // Only apply if we're not in the middle of a programmatic swing
    if (!window.swingState?.isSwinging) {
        // Get the gyroscope-based sword rotation
        const rotationData = mobileData.swordRotation;
        if (rotationData) {
            // Apply it to the sword, with some damping to smooth out jerky movements
            const dampingFactor = 0.1; // Lower = smoother but more lag
            
            // Adjust the base rotations to account for the sword's initial position
            const targetRotX = Math.PI / 6 + Math.PI + rotationData.x * 0.5;
            const targetRotY = Math.PI / 2 + rotationData.z * 0.5;
            const targetRotZ = -Math.PI / 8 - Math.PI / 6 + rotationData.y * 0.5;
            
            // Apply damping
            sword.rotation.x += (targetRotX - sword.rotation.x) * dampingFactor;
            sword.rotation.y += (targetRotY - sword.rotation.y) * dampingFactor;
            sword.rotation.z += (targetRotZ - sword.rotation.z) * dampingFactor;
        }
    }
}

// Find mobile users to pair with (for desktop clients)
export function findUnpairedMobileDevices() {
    if (!room || !isDesktop || pairedClientId) return;
    
    console.log('Looking for mobile devices to pair with...');
    
    // Find mobile users without a paired desktop
    for (const clientId in room.presence) {
        const presenceData = room.presence[clientId];
        
        if (presenceData.type === 'mobile' && !presenceData.pairedWith) {
            console.log(`Found unpaired mobile: ${room.peers[clientId]?.username}`);
            
            // Send a pairing request automatically
            pairedClientId = clientId;
            room.updatePresence({
                pairedWith: clientId
            });
            
            // Notify the mobile device
            room.requestPresenceUpdate(clientId, {
                type: 'pairAccepted',
                desktopClientId: room.clientId
            });
            
            showPairingStatus(`Paired with mobile controller: ${room.peers[clientId]?.username || 'Unknown User'}`);
            return;
        }
    }
}

// Play a sword swing effect for a remote player
export function playRemoteSwordSwingEffect(clientId) {
    if (!playerEntities[clientId]) return;
    
    const playerMesh = playerEntities[clientId];
    const remoteSword = playerMesh.userData.sword;
    
    if (!remoteSword) return;
    
    // Animate the sword swing
    const originalRotation = remoteSword.rotation.z;
    const animationDuration = 500; // ms
    const startTime = Date.now();
    
    // Simple swing animation
    function animateSwing() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / animationDuration);
        
        // Swing forward and back
        if (progress < 0.5) {
            remoteSword.rotation.z = originalRotation - progress * 2 * Math.PI / 2;
        } else {
            remoteSword.rotation.z = originalRotation - (1 - progress) * 2 * Math.PI / 2;
        }
        
        if (progress < 1) {
            requestAnimationFrame(animateSwing);
        } else {
            remoteSword.rotation.z = originalRotation;
        }
    }
    
    animateSwing();
}