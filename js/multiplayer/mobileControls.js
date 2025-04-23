import * as THREE from 'three';
import { room, pairedClientId } from './core.js';
import { createMobileUI } from './ui.js';
import { findDesktopToPair } from './pairingSystem.js';
import { showPairingStatus } from './ui.js';

// Initialize mobile controls (gyroscope and accelerometer)
export function initMobileControls() {
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
export function handleDeviceOrientation(event) {
    // Normalize orientation values
    const alpha = event.alpha || 0; // Z-axis rotation [0, 360)
    const beta = event.beta || 0;   // X-axis rotation [-180, 180]
    const gamma = event.gamma || 0; // Y-axis rotation [-90, 90]
    
    // Update our presence with the new gyroscope data
    if (room && pairedClientId) {
        room.updatePresence({
            gyroscope: { alpha, beta, gamma },
            swordRotation: calculateSwordRotationFromGyro(alpha, beta, gamma)
        });
    }
}

// Handle device motion events (accelerometer)
export function handleDeviceMotion(event) {
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
        
        // Detect sword swings based on acceleration
        detectSwordSwing(accel);
    }
}

// Detect sword swing gestures from accelerometer data
let lastAcceleration = { x: 0, y: 0, z: 0 };
let swingCooldown = false;

export function detectSwordSwing(accel) {
    if (swingCooldown) return;
    
    // Calculate acceleration magnitude change
    const deltaX = Math.abs(accel.x - lastAcceleration.x);
    const deltaY = Math.abs(accel.y - lastAcceleration.y);
    const deltaZ = Math.abs(accel.z - lastAcceleration.z);
    
    // Set a threshold for what constitutes a swing
    const swingThreshold = 15; // Adjust based on testing
    
    if (deltaX + deltaY + deltaZ > swingThreshold) {
        console.log('Sword swing detected!');
        
        // Send a message to all clients about the sword swing
        room.send({
            type: 'swordSwing',
            clientId: room.clientId,
            username: room.peers[room.clientId]?.username || 'Unknown Player',
            intensity: deltaX + deltaY + deltaZ
        });
        
        // Notify the paired desktop client to swing their sword
        if (pairedClientId) {
            room.requestPresenceUpdate(pairedClientId, {
                type: 'swordSwingTrigger',
                intensity: deltaX + deltaY + deltaZ
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
export function calculateSwordRotationFromGyro(alpha, beta, gamma) {
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

// Request permission for sensors on iOS
export async function requestSensorPermission() {
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
export function triggerManualSwordSwing() {
    if (!room || !pairedClientId) return;
    
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