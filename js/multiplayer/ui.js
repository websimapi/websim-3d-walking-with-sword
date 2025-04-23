import { room, pairedClientId } from './core.js';
import { isDesktop } from './deviceDetection.js';
import { requestSensorPermission, triggerManualSwordSwing } from './mobileControls.js';
import { findDesktopToPair } from './pairingSystem.js';

// Create mobile UI
export function createMobileUI() {
    const mobileUIContainer = document.createElement('div');
    mobileUIContainer.id = 'mobile-ui-container';
    mobileUIContainer.innerHTML = `
        <div id="mobile-controls">
            <h1>Sword Controller</h1>
            <p id="pairing-status">Looking for a player to connect to...</p>
            <button id="request-sensor-permission" style="display: none;">Enable Gyroscope & Accelerometer</button>
            <button id="pair-button">Find Player</button>
            <div id="swing-button">SWING</div>
        </div>
    `;
    
    document.body.appendChild(mobileUIContainer);
    
    // Set up event listeners
    document.getElementById('request-sensor-permission').addEventListener('click', requestSensorPermission);
    document.getElementById('pair-button').addEventListener('click', findDesktopToPair);
    document.getElementById('swing-button').addEventListener('touchstart', triggerManualSwordSwing);
}

// Show pairing status message
export function showPairingStatus(message) {
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