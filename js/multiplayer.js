import * as THREE from 'three';
import { scene, camera } from './sceneSetup.js';
import { sword, handOffset } from './sword.js';
import { controls } from './controls.js';

// Store multiplayer state
export let room;
export const playerEntities = {};
export let isDesktop = true;
export let pairedClientId = null;

// Control modes for mobile
export const mobileControlModes = {
    BUTTON: 'button',   // Simple button press to swing
    MOTION: 'motion',   // Motion-based swing detection
    POSITION: 'position' // Direct sword position control
};

// Current control mode
export let currentMobileMode = mobileControlModes.MOTION;

// Check if the device is mobile or desktop
export function detectDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Check for mobile device
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
        isDesktop = false;
        document.body.classList.add('mobile-device');
        return 'mobile';
    } else {
        isDesktop = true;
        document.body.classList.add('desktop-device');
        return 'desktop';
    }
}

// Initialize multiplayer room
export async function initMultiplayer() {
    const deviceType = detectDeviceType();
    console.log(`Device detected as: ${deviceType}`);
    
    // Initialize WebsimSocket
    room = new WebsimSocket();
    await room.initialize();
    
    // Initialize our presence with device type and position
    const initialPresence = isDesktop ? 
        {
            type: 'desktop',
            position: { x: 0, y: 1.7, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            health: 100,
            pairedWith: null,
            username: room.peers[room.clientId]?.username || 'Unknown Player'
        } : 
        {
            type: 'mobile',
            swordRotation: { x: 0, y: 0, z: 0 },
            pairedWith: null,
            accelerometer: { x: 0, y: 0, z: 0 },
            gyroscope: { alpha: 0, beta: 0, gamma: 0 },
            controlMode: currentMobileMode,
            username: room.peers[room.clientId]?.username || 'Unknown Player'
        };
    
    room.updatePresence(initialPresence);
    
    // Set up subscription for presence updates
    room.subscribePresence(handlePresenceUpdate);
    
    // Set up subscription for presence update requests
    room.subscribePresenceUpdateRequests(handlePresenceUpdateRequest);
    
    // Listen for messages
    room.onmessage = handleMessage;
    
    // Initialize appropriate controls based on device type
    if (!isDesktop) {
        initMobileControls();
    } else {
        initPlayerRepresentations();
        // Look for mobile devices that need pairing
        findUnpairedMobileDevices();
    }
    
    return { room, deviceType };
}

// Handle presence updates
function handlePresenceUpdate(allPresence) {
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

// Handle presence update requests
function handlePresenceUpdateRequest(updateRequest, fromClientId) {
    console.log('Presence update request from', fromClientId, updateRequest);
    
    // Handle pairing requests
    if (updateRequest.type === 'pairRequest' && isDesktop) {
        // Accept the pairing
        pairedClientId = fromClientId;
        room.updatePresence({
            pairedWith: fromClientId
        });
        
        // Notify the mobile device that pairing was successful
        room.requestPresenceUpdate(fromClientId, {
            type: 'pairAccepted',
            desktopClientId: room.clientId
        });
        
        // Update UI to show pairing status
        showPairingStatus(`Paired with mobile controller: ${room.peers[fromClientId]?.username || 'Unknown User'}`);
    }
    
    // Handle pairing acceptance (mobile receives this)
    if (updateRequest.type === 'pairAccepted' && !isDesktop) {
        pairedClientId = fromClientId;
        room.updatePresence({
            pairedWith: fromClientId
        });
        
        // Update UI to show pairing status
        showPairingStatus(`Paired with desktop: ${room.peers[fromClientId]?.username || 'Unknown User'}`);
    }
}

// Handle messages
function handleMessage(event) {
    const data = event.data;
    
    switch (data.type) {
        case "connected":
            console.log(`Client ${data.clientId} (${data.username}) connected`);
            // If we're desktop, we might want to offer pairing to new mobile users
            if (isDesktop && !pairedClientId) {
                findUnpairedMobileDevices();
            }
            break;
            
        case "disconnected":
            console.log(`Client ${data.clientId} (${data.username}) disconnected`);
            // If our paired device disconnected, clear the pairing
            if (pairedClientId === data.clientId) {
                pairedClientId = null;
                room.updatePresence({
                    pairedWith: null
                });
                showPairingStatus('Mobile controller disconnected');
            }
            
            // Remove the player representation if it exists
            if (playerEntities[data.clientId]) {
                scene.remove(playerEntities[data.clientId]);
                delete playerEntities[data.clientId];
            }
            break;
            
        case "swordSwing":
            // Play sword swing effect or animation for other players
            if (data.clientId !== room.clientId) {
                console.log(`Player ${data.username} swung their sword!`);
                playRemoteSwordSwingEffect(data.clientId);
            }
            break;
    }
}

// Initialize visible representations of other players
function initPlayerRepresentations() {
    // Create representations for all existing players
    for (const clientId in room.presence) {
        if (clientId !== room.clientId) {
            createPlayerRepresentation(clientId, room.presence[clientId]);
        }
    }
}

// Create 3D representation of a player
function createPlayerRepresentation(clientId, presenceData) {
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

// Initialize mobile controls (gyroscope and accelerometer)
function initMobileControls() {
    // Show mobile UI
    createMobileUI();
    
    // Set up device orientation (gyroscope) event listener
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
        console.log('Device orientation events supported');
    } else {
        console.warn('Device orientation not supported on this device');
        showPairingStatus('Gyroscope not supported on this device');
    }
    
    // Set up device motion (accelerometer) event listener
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleDeviceMotion);
        console.log('Device motion events supported');
    } else {
        console.warn('Device motion not supported on this device');
    }
    
    // Request permission for motion sensors on iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        document.getElementById('request-sensor-permission').style.display = 'block';
    } else {
        // For non-iOS devices or older iOS versions, sensors should work without permission
        findDesktopToPair();
    }
}

// Handle device orientation events (gyroscope)
function handleDeviceOrientation(event) {
    // Normalize orientation values
    const alpha = event.alpha || 0; // Z-axis rotation [0, 360)
    const beta = event.beta || 0;   // X-axis rotation [-180, 180]
    const gamma = event.gamma || 0; // Y-axis rotation [-90, 90]
    
    // Update our presence with the new gyroscope data
    if (room && pairedClientId) {
        const swordRotation = calculateSwordRotationFromGyro(alpha, beta, gamma);
        
        room.updatePresence({
            gyroscope: { alpha, beta, gamma },
            swordRotation: swordRotation
        });
        
        // In position control mode, we also rotate based on phone orientation
        if (currentMobileMode === mobileControlModes.POSITION) {
            // This will be processed by the desktop to update sword position
        }
    }
}

// Handle device motion events (accelerometer)
function handleDeviceMotion(event) {
    if (!event.accelerationIncludingGravity) return;
    
    const accel = event.accelerationIncludingGravity;
    
    // Update our presence with the new accelerometer data
    if (room && pairedClientId) {
        room.updatePresence({
            accelerometer: { 
                x: accel.x || 0, 
                y: accel.y || 0, 
                z: accel.z || 0 
            }
        });
        
        // Only detect swings in MOTION mode
        if (currentMobileMode === mobileControlModes.MOTION) {
            // Detect sword swings based on acceleration
            detectSwordSwing(accel);
        }
    }
}

// Detect sword swing gestures from accelerometer data
let lastAcceleration = { x: 0, y: 0, z: 0 };
let swingCooldown = false;

function detectSwordSwing(accel) {
    if (swingCooldown) return;
    
    // Calculate acceleration magnitude change
    const deltaX = Math.abs(accel.x - lastAcceleration.x);
    const deltaY = Math.abs(accel.y - lastAcceleration.y);
    const deltaZ = Math.abs(accel.z - lastAcceleration.z);
    
    // Set a threshold for what constitutes a swing
    const swingThreshold = 15; // Adjust based on testing
    
    if (deltaX + deltaY + deltaZ > swingThreshold) {
        console.log('Sword swing detected!');
        
        // Calculate intensity for vibration and effects
        const intensity = deltaX + deltaY + deltaZ;
        
        // Vibrate the device based on swing intensity
        vibrateDevice(intensity);
        
        // Send a message to all clients about the sword swing
        room.send({
            type: 'swordSwing',
            clientId: room.clientId,
            username: room.peers[room.clientId]?.username || 'Unknown Player',
            intensity: intensity
        });
        
        // Notify the paired desktop client to swing their sword
        if (pairedClientId) {
            room.requestPresenceUpdate(pairedClientId, {
                type: 'swordSwingTrigger',
                intensity: intensity
            });
        }
        
        // Set cooldown to prevent rapid swings
        swingCooldown = true;
        setTimeout(() => {
            swingCooldown = false;
        }, 500); // 500ms cooldown
    }
    
    // Update last acceleration values
    lastAcceleration = { x: accel.x, y: accel.y, z: accel.z };
}

// Calculate sword rotation based on gyroscope data
function calculateSwordRotationFromGyro(alpha, beta, gamma) {
    // Map gyroscope angles to sword rotation
    // These mappings can be adjusted based on how you want the sword to respond
    
    // Clamp the values to prevent extreme rotations
    const clampedBeta = Math.max(-45, Math.min(45, beta));
    const clampedGamma = Math.max(-45, Math.min(45, gamma));
    
    // Map the gyroscope values to sword rotation
    const rotX = THREE.MathUtils.degToRad(clampedBeta);
    const rotY = THREE.MathUtils.degToRad(alpha);
    const rotZ = THREE.MathUtils.degToRad(-clampedGamma);
    
    return { x: rotX, y: rotY, z: rotZ };
}

// Apply mobile gyroscope data to desktop sword orientation
function applySwordOrientationFromMobile(mobileData) {
    if (!sword) return;
    
    // Get the mobile control mode
    const controlMode = mobileData.controlMode || mobileControlModes.MOTION;
    
    // In position mode, we directly control the sword position with phone orientation
    // Regardless of swing state
    if (controlMode === mobileControlModes.POSITION) {
        // Get the gyroscope-based sword rotation
        const rotationData = mobileData.swordRotation;
        if (rotationData) {
            // Apply it to the sword with more responsive (less dampened) control
            const dampingFactor = 0.2; // Higher = more responsive to changes
            
            // Adjust the base rotations to account for the sword's initial position
            const targetRotX = Math.PI / 6 + Math.PI + rotationData.x * 0.7;
            const targetRotY = Math.PI / 2 + rotationData.z * 0.7;
            const targetRotZ = -Math.PI / 8 - Math.PI / 6 + rotationData.y * 0.7;
            
            // Apply damping
            sword.rotation.x += (targetRotX - sword.rotation.x) * dampingFactor;
            sword.rotation.y += (targetRotY - sword.rotation.y) * dampingFactor;
            sword.rotation.z += (targetRotZ - sword.rotation.z) * dampingFactor;
        }
    } 
    // In other modes, only apply orientation when not swinging
    else if (!window.swingState?.isSwinging) {
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

// Find desktop users to pair with (for mobile clients)
function findDesktopToPair() {
    if (!room || isDesktop || pairedClientId) return;
    
    console.log('Looking for desktop users to pair with...');
    
    // Find desktop users without a paired mobile
    for (const clientId in room.presence) {
        const presenceData = room.presence[clientId];
        
        if (presenceData.type === 'desktop' && !presenceData.pairedWith) {
            console.log(`Found unpaired desktop: ${room.peers[clientId]?.username}`);
            
            // Send a pairing request
            room.requestPresenceUpdate(clientId, {
                type: 'pairRequest',
                mobileClientId: room.clientId
            });
            
            showPairingStatus(`Sent pairing request to: ${room.peers[clientId]?.username || 'Unknown User'}`);
            return;
        }
    }
    
    showPairingStatus('No unpaired desktop users found. Wait for someone to join.');
}

// Find mobile users to pair with (for desktop clients)
function findUnpairedMobileDevices() {
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
function playRemoteSwordSwingEffect(clientId) {
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

// Vibrate the mobile device
function vibrateDevice(intensity) {
    // Check if vibration API is supported
    if (!navigator.vibrate) {
        console.log('Vibration API not supported');
        return;
    }
    
    // Scale intensity to a reasonable vibration duration (50-300ms)
    const baseDuration = 100;
    let vibrationDuration = Math.min(300, Math.max(50, baseDuration + intensity * 2));
    
    // For stronger swings, use a pattern
    if (intensity > 25) {
        // Strong swing: vibrate-pause-vibrate pattern
        navigator.vibrate([vibrationDuration, 50, vibrationDuration * 0.7]);
    } else if (intensity > 20) {
        // Medium swing: simple pattern
        navigator.vibrate([vibrationDuration, 30, vibrationDuration * 0.5]);
    } else {
        // Regular swing: single vibration
        navigator.vibrate(vibrationDuration);
    }
    
    console.log(`Vibrating for ${vibrationDuration}ms with intensity ${intensity}`);
}

// Create mobile UI
function createMobileUI() {
    const mobileUIContainer = document.createElement('div');
    mobileUIContainer.id = 'mobile-ui-container';
    mobileUIContainer.innerHTML = `
        <div id="mobile-controls">
            <h1>Sword Controller</h1>
            <p id="pairing-status">Looking for a player to connect to...</p>
            <button id="request-sensor-permission" style="display: none;">Enable Gyroscope & Accelerometer</button>
            <button id="pair-button">Find Player</button>
            <div id="control-mode-selector">
                <label>Control Mode:</label>
                <select id="control-mode">
                    <option value="${mobileControlModes.MOTION}">Motion Swing</option>
                    <option value="${mobileControlModes.BUTTON}">Button Swing</option>
                    <option value="${mobileControlModes.POSITION}">Position Control</option>
                </select>
            </div>
            <div id="swing-button">SWING</div>
        </div>
    `;
    
    document.body.appendChild(mobileUIContainer);
    
    // Set up event listeners
    document.getElementById('request-sensor-permission').addEventListener('click', requestSensorPermission);
    document.getElementById('pair-button').addEventListener('click', findDesktopToPair);
    document.getElementById('swing-button').addEventListener('touchstart', triggerManualSwordSwing);
    
    // Control mode selector
    const controlModeSelect = document.getElementById('control-mode');
    controlModeSelect.addEventListener('change', function() {
        currentMobileMode = this.value;
        console.log(`Switched to control mode: ${currentMobileMode}`);
        
        // Update presence with new control mode
        if (room) {
            room.updatePresence({
                controlMode: currentMobileMode
            });
        }
        
        // Show/hide swing button based on mode
        const swingButton = document.getElementById('swing-button');
        if (currentMobileMode === mobileControlModes.POSITION) {
            swingButton.style.display = 'none';
        } else {
            swingButton.style.display = 'flex';
        }
    });
}

// Request permission for sensors on iOS
async function requestSensorPermission() {
    try {
        await DeviceOrientationEvent.requestPermission();
        await DeviceMotionEvent.requestPermission();
        
        document.getElementById('request-sensor-permission').style.display = 'none';
        showPairingStatus('Sensors enabled! Looking for players to connect to...');
        findDesktopToPair();
    } catch (error) {
        console.error('Error requesting sensor permission:', error);
        showPairingStatus('Failed to enable sensors. Please try again.');
    }
}

// Trigger manual sword swing (for mobile devices without working accelerometer)
function triggerManualSwordSwing() {
    if (!room || !pairedClientId) return;
    
    // Vibrate the device
    vibrateDevice(20); // Medium intensity for button press
    
    // Send a sword swing message
    room.send({
        type: 'swordSwing',
        clientId: room.clientId,
        username: room.peers[room.clientId]?.username || 'Unknown Player',
        intensity: 20 // Default intensity
    });
    
    // Notify the paired desktop client
    room.requestPresenceUpdate(pairedClientId, {
        type: 'swordSwingTrigger',
        intensity: 20
    });
}

// Show pairing status message
function showPairingStatus(message) {
    const statusElement = document.getElementById('pairing-status');
    if (statusElement) {
        statusElement.textContent = message;
    } else if (!isDesktop) {
        // If status element doesn't exist yet (first load)
        setTimeout(() => showPairingStatus(message), 500);
    } else {
        // For desktop, create a floating status indicator
        let statusDisplay = document.getElementById('desktop-pairing-status');
        
        if (!statusDisplay) {
            statusDisplay = document.createElement('div');
            statusDisplay.id = 'desktop-pairing-status';
            document.body.appendChild(statusDisplay);
        }
        
        statusDisplay.textContent = message;
        statusDisplay.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusDisplay.style.display = 'none';
        }, 5000);
    }
}

// Update our presence with position data
export function updatePlayerPosition(position, rotation) {
    if (!room || !isDesktop) return;
    
    room.updatePresence({
        position: {
            x: position.x,
            y: position.y,
            z: position.z
        },
        rotation: {
            y: rotation.y
        }
    });
}