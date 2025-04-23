import * as THREE from 'three';
import { scene, camera } from './sceneSetup.js';
import { controls, movementState } from './controls.js';
import { swordInventory } from './sword.js';

// Store references to other players
export let room;
export const otherPlayers = {};

// Initialize multiplayer room
export async function initMultiplayer() {
    // Initialize WebsimSocket (available globally)
    room = new WebsimSocket();
    await room.initialize();

    // Set initial player presence
    const initialPresence = {
        position: { x: 0, y: 1.7, z: 0 },
        rotation: { y: 0 },
        equippedSword: -1,
        swordSwinging: false,
        swordTexture: null // Initialize with no sword texture
    };
    
    room.updatePresence(initialPresence);

    // Subscribe to presence updates (when other players move/change)
    room.subscribePresence((currentPresence) => {
        updateOtherPlayers(currentPresence);
    });

    // Subscribe to presence update requests (e.g. sword swing animations)
    room.subscribePresenceUpdateRequests((updateRequest, fromClientId) => {
        if (updateRequest.type === 'swordSwing') {
            // Update our presence to show the swing
            const myPresence = room.presence[room.clientId];
            room.updatePresence({
                ...myPresence,
                swordSwinging: true
            });
            
            // Reset after animation completes
            setTimeout(() => {
                const currentPresence = room.presence[room.clientId];
                room.updatePresence({
                    ...currentPresence,
                    swordSwinging: false
                });
            }, 500); // Match swing animation duration
        }
    });

    // Handle incoming messages
    room.onmessage = (event) => {
        const data = event.data;
        switch (data.type) {
            case "connected":
                console.log(`Player joined: ${data.username} (${data.clientId})`);
                break;
            case "disconnected":
                console.log(`Player left: ${data.username} (${data.clientId})`);
                if (otherPlayers[data.clientId]) {
                    // Remove player model from scene
                    scene.remove(otherPlayers[data.clientId].model);
                    delete otherPlayers[data.clientId];
                }
                break;
        }
    };
    
    // Update player count UI
    updatePlayerCountUI();
    
    console.log("Multiplayer initialized");
}

// Update player position in presence
export function updatePlayerPosition() {
    if (!room) return;
    
    // Get current position from camera
    const position = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
    };
    
    // Get rotation (just Y is enough for avatar direction)
    const rotation = {
        y: camera.rotation.y
    };
    
    // Update our presence
    room.updatePresence({
        position: position,
        rotation: rotation
    });
    
    // Update player count UI
    updatePlayerCountUI();
}

// Update player's equipped sword in presence
export function updatePlayerSword(swordIndex) {
    if (!room) return;
    
    // Get the texture URL of the sword to share with other players
    let swordTextureUrl = null;
    if (swordIndex >= 0 && swordIndex < swordInventory.length) {
        swordTextureUrl = swordInventory[swordIndex].processedUrl;
    }
    
    room.updatePresence({
        equippedSword: swordIndex,
        swordTexture: swordTextureUrl
    });
}

// Broadcast sword swing event to other players
export function broadcastSwordSwing() {
    if (!room) return;
    
    room.send({
        type: "swordSwing",
        position: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        }
    });
    
    // Also update our local presence
    const myPresence = room.presence[room.clientId];
    room.updatePresence({
        ...myPresence,
        swordSwinging: true
    });
    
    // Reset after animation completes
    setTimeout(() => {
        const currentPresence = room.presence[room.clientId];
        room.updatePresence({
            ...currentPresence,
            swordSwinging: false
        });
    }, 500); // Match swing animation duration
}

// Update and render other players
function updateOtherPlayers(presenceData) {
    // Skip if we don't have a room yet
    if (!room) return;
    
    // Process each player's presence
    Object.keys(presenceData).forEach(clientId => {
        // Skip ourselves
        if (clientId === room.clientId) return;
        
        const playerData = presenceData[clientId];
        
        // Skip if missing required data
        if (!playerData.position) return;
        
        // Create or update player representation
        if (!otherPlayers[clientId]) {
            // Create new player representation
            createPlayerRepresentation(clientId, playerData);
        } else {
            // Update existing player
            updatePlayerRepresentation(clientId, playerData);
        }
    });
    
    // Remove players that are no longer present
    Object.keys(otherPlayers).forEach(clientId => {
        if (!presenceData[clientId]) {
            scene.remove(otherPlayers[clientId].model);
            delete otherPlayers[clientId];
        }
    });
    
    // Update player count UI
    updatePlayerCountUI();
}

// Create visual representation for other player
function createPlayerRepresentation(clientId, playerData) {
    // Create a group to hold player model and sword
    const playerModel = new THREE.Group();
    
    // Add a simple avatar representing the player body
    const avatarGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
    const avatarMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0088ff, 
        transparent: true, 
        opacity: 0.5,
        wireframe: true
    });
    const avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
    avatar.position.y = 0.9; // Centered at ground + half height (for a 1.8 unit tall player)
    playerModel.add(avatar);
    
    // Add player name label if available
    if (room.peers[clientId]) {
        const username = room.peers[clientId].username;
        const nameSprite = createPlayerNameTag(username);
        nameSprite.position.y = 2.1; // Above head
        playerModel.add(nameSprite);
    }
    
    // Add sword placeholder (will be updated when they equip a sword)
    const swordGroup = new THREE.Group();
    swordGroup.position.y = 1.7; // Eye level
    playerModel.add(swordGroup);
    
    // Position the player model on the ground
    // We need to adjust: the model is placed at ground level, but the "head" is at player.position.y
    playerModel.position.set(
        playerData.position.x,
        0, // Ground level
        playerData.position.z
    );
    
    // Add to scene
    scene.add(playerModel);
    
    // Store reference to player model and sword group
    otherPlayers[clientId] = {
        model: playerModel,
        swordGroup: swordGroup,
        equippedSword: -1,
        avatar: avatar
    };
    
    // If they already have a sword equipped, render it
    if (playerData.equippedSword !== undefined && playerData.equippedSword >= 0) {
        updatePlayerSwordVisual(clientId, playerData);
    }
}

// Update existing player visualization
function updatePlayerRepresentation(clientId, playerData) {
    const player = otherPlayers[clientId];
    if (!player) return;
    
    // Update position - only update X and Z, keeping the model on the ground
    if (playerData.position) {
        player.model.position.set(
            playerData.position.x,
            0, // Keep at ground level
            playerData.position.z
        );
        
        // Update the sword group to be at eye level (approximately camera.y)
        if (player.swordGroup) {
            player.swordGroup.position.y = playerData.position.y;
        }
    }
    
    // Update rotation if available
    if (playerData.rotation) {
        player.model.rotation.y = playerData.rotation.y;
    }
    
    // Update sword if changed or if the texture changed
    if ((playerData.equippedSword !== undefined && 
         playerData.equippedSword !== player.equippedSword) ||
        (playerData.swordTexture !== player.swordTexture)) {
        updatePlayerSwordVisual(clientId, playerData);
    }
    
    // Handle sword swing animation
    if (playerData.swordSwinging !== undefined) {
        if (playerData.swordSwinging && player.sword) {
            animatePlayerSwordSwing(clientId);
        }
    }
}

// Create a text sprite for player name
function createPlayerNameTag(name) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.font = '24px Arial';
    context.fillStyle = 'rgba(255,255,255,0.95)';
    context.textAlign = 'center';
    context.fillText(name, 128, 24);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1, 0.25, 1);
    
    return sprite;
}

// Update player's sword visual based on their equipped sword
function updatePlayerSwordVisual(clientId, playerData) {
    const player = otherPlayers[clientId];
    if (!player) return;
    
    // Remove existing sword if any
    if (player.sword) {
        player.swordGroup.remove(player.sword);
        player.sword = null;
    }
    
    // If no sword equipped, we're done
    if (playerData.equippedSword < 0) return;
    
    // Store the texture URL in player data
    player.swordTexture = playerData.swordTexture;
    player.equippedSword = playerData.equippedSword;
    
    // Create the sword with the player's texture if available
    let sword;
    
    if (playerData.swordTexture) {
        // Use the shared texture
        const swordTexture = new THREE.TextureLoader().load(playerData.swordTexture);
        swordTexture.flipY = false;
        
        const swordMaterial = new THREE.MeshStandardMaterial({ 
            map: swordTexture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.5,
            emissive: 0x4466ff,
            emissiveIntensity: 0,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1.5
        });
        
        const swordGeometry = new THREE.PlaneGeometry(1, 1);
        sword = new THREE.Mesh(swordGeometry, swordMaterial);
    } else {
        // Fallback to generic sword
        const swordGeometry = new THREE.PlaneGeometry(0.3, 1);
        const swordMaterial = new THREE.MeshBasicMaterial({
            color: 0x4466ff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        sword = new THREE.Mesh(swordGeometry, swordMaterial);
    }
    
    // Set up sword positioning
    sword.rotation.y = Math.PI / 2;
    sword.rotation.z = -Math.PI / 8 - Math.PI / 6;
    sword.rotation.x = Math.PI / 6 + Math.PI;
    sword.position.set(0.5, -0.4, -0.7);
    
    player.swordGroup.add(sword);
    player.sword = sword;
}

// Animate other player's sword swing
function animatePlayerSwordSwing(clientId) {
    const player = otherPlayers[clientId];
    if (!player || !player.sword) return;
    
    // Clone the current sword rotation
    const startRotation = {
        x: player.sword.rotation.x,
        y: player.sword.rotation.y,
        z: player.sword.rotation.z
    };
    
    // End rotation for swing
    const endRotation = {
        x: startRotation.x + 1.0,
        y: startRotation.y,
        z: startRotation.z - 1.5
    };
    
    // Animation duration
    const duration = 500; // ms
    const startTime = Date.now();
    
    // Swing animation function
    function animateSwing() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Forward swing (0 to 0.5 progress)
        if (progress <= 0.5) {
            const swingProgress = progress * 2; // Scale to 0-1
            player.sword.rotation.x = startRotation.x + (endRotation.x - startRotation.x) * swingProgress;
            player.sword.rotation.z = startRotation.z + (endRotation.z - startRotation.z) * swingProgress;
        }
        // Return swing (0.5 to 1 progress)
        else {
            const swingProgress = (progress - 0.5) * 2; // Scale to 0-1
            player.sword.rotation.x = endRotation.x - (endRotation.x - startRotation.x) * swingProgress;
            player.sword.rotation.z = endRotation.z - (endRotation.z - startRotation.z) * swingProgress;
        }
        
        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(animateSwing);
        }
    }
    
    // Start animation
    animateSwing();
}

// Update the players counter in the UI
function updatePlayerCountUI() {
    if (!room) return;
    
    const playerCount = Object.keys(room.peers).length;
    const connectedPlayersElement = document.getElementById('connected-players');
    if (connectedPlayersElement) {
        connectedPlayersElement.textContent = `Connected Players: ${playerCount}`;
    }
}