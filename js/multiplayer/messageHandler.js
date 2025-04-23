import { room, pairedClientId } from './core.js';
import { playerEntities, playRemoteSwordSwingEffect, findUnpairedMobileDevices } from './playerRepresentation.js';
import { isDesktop } from './deviceDetection.js';
import { scene } from '../sceneSetup.js';
import { showPairingStatus } from './ui.js';

// Handle messages
export function handleMessage(event) {
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