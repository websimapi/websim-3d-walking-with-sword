import { detectDeviceType, isDesktop } from './deviceDetection.js';
import { handlePresenceUpdate } from './playerRepresentation.js';
import { handlePresenceUpdateRequest } from './pairingSystem.js';
import { handleMessage } from './messageHandler.js';
import { initMobileControls } from './mobileControls.js';
import { initPlayerRepresentations, findUnpairedMobileDevices } from './playerRepresentation.js';

// Store multiplayer state
export let room;
export let pairedClientId = null;

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