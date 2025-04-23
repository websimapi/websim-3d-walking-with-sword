import { room, pairedClientId } from './core.js';
import { isDesktop } from './deviceDetection.js';
import { showPairingStatus } from './ui.js';

// Handle presence update requests
export function handlePresenceUpdateRequest(updateRequest, fromClientId) {
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
    
    // Handle sword swing triggers
    if (updateRequest.type === 'swordSwingTrigger' && isDesktop) {
        // Import and call handleSwordSwing
        import('../sword.js').then(module => {
            module.handleSwordSwing(updateRequest.intensity);
            
            // Broadcast swing event to all players
            room.send({
                type: 'swordSwing',
                clientId: room.clientId,
                username: room.peers[room.clientId]?.username || 'Unknown Player',
                intensity: updateRequest.intensity || 1
            });
        });
    }
}

// Find desktop users to pair with (for mobile clients)
export function findDesktopToPair() {
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