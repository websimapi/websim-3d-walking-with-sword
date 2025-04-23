// Controls.js - Movement and input handling
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { toggleInventory } from './sword.js';

// Movement variables
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let controls;

// Set up player controls
export function setupControls(camera, scene) {
    // Create pointer lock controls
    controls = new PointerLockControls(camera, document.body);
    
    // Menu state
    let menuOpen = false;
    
    // Set up click handler to lock controls
    document.addEventListener('click', function() {
        if (!menuOpen) {
            controls.lock();
        }
    });
    
    // Handle lock/unlock events
    controls.addEventListener('lock', function() {
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('inventory-container').style.display = 'none';
        menuOpen = false;
    });
    
    controls.addEventListener('unlock', function() {
        // Don't show anything on unlock
    });
    
    // Handle keyboard input
    setupKeyboardControls();
    
    // Set up animation update
    setupMovementUpdate();
    
    return controls;
}

// Set up keyboard event handlers
function setupKeyboardControls() {
    // Handle key press
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' || event.key === 'i' || event.key === 'I') {
            if (controls.isLocked) {
                controls.unlock();
                setTimeout(() => {
                    toggleInventory(true);
                }, 100);
            } else if (document.getElementById('inventory-container').style.display === 'none') {
                toggleInventory(true);
            }
        }
        
        switch(event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
        }
    });
    
    // Handle key release
    document.addEventListener('keyup', function(event) {
        switch(event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
        }
    });
    
    // Handle mouse click for sword swinging
    document.addEventListener('mousedown', function(event) {
        // Dispatch event to sword module
        if (event.button === 0 && controls.isLocked) {
            window.dispatchEvent(new CustomEvent('swordSwing'));
        }
    });
}

// Set up movement update (called each frame)
function setupMovementUpdate() {
    window.addEventListener('animate', function(e) {
        const delta = e.detail.delta;
        
        // Movement code
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        
        if (moveForward || moveBackward) velocity.z -= direction.z * 20.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 20.0 * delta;
        
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
    });
}

// Get control state
export function isControlLocked() {
    return controls ? controls.isLocked : false;
}

// Lock/unlock controls
export function setControlLock(lock) {
    if (controls) {
        if (lock && !controls.isLocked) {
            controls.lock();
        } else if (!lock && controls.isLocked) {
            controls.unlock();
        }
    }
}