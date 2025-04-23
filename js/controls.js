import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { camera } from './sceneSetup.js';
import { showInventory } from './inventory.js';
import { handleSwordSwing } from './sword.js';
import { updatePlayerPosition, isDesktop } from './multiplayer.js';

// Movement state
export const movementState = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3()
};

export let controls;

export function initControls(camera, domElement) {
    // Only initialize full controls on desktop
    if (isDesktop) {
        controls = new PointerLockControls(camera, domElement);
        
        document.addEventListener('click', function() {
            if (!isMenuOpen()) {
                controls.lock();
            }
        });
        
        controls.addEventListener('lock', function() {
            document.getElementById('instructions').style.display = 'none';
            document.getElementById('inventory-container').style.display = 'none';
        });
        
        controls.addEventListener('unlock', function() {
            // Don't show anything on unlock
        });
        
        // Mouse click for sword swinging
        document.addEventListener('mousedown', function(event) {
            // Left mouse button (button 0)
            if (event.button === 0 && controls.isLocked) {
                handleSwordSwing();
            }
        });
    } else {
        // On mobile, create a simple camera controller that doesn't require pointer lock
        controls = {
            isLocked: false,
            lock: function() {},
            unlock: function() {},
            moveRight: function() {},
            moveForward: function() {},
            addEventListener: function() {}
        };
    }
    
    return controls;
}

function isMenuOpen() {
    const inventoryContainer = document.getElementById('inventory-container');
    return inventoryContainer.style.display === 'flex';
}

export function setupMovementControls() {
    // Only set up keyboard controls on desktop
    if (isDesktop) {
        // Handle ESC key and I key to open inventory
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' || event.key === 'i' || event.key === 'I') {
                if (controls.isLocked) {
                    controls.unlock();
                    setTimeout(() => {
                        showInventory();
                    }, 100);
                } else if (document.getElementById('inventory-container').style.display === 'none') {
                    showInventory();
                }
            }
            
            switch(event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    movementState.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    movementState.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    movementState.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    movementState.moveRight = true;
                    break;
            }
        });
        
        document.addEventListener('keyup', function(event) {
            switch(event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    movementState.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    movementState.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    movementState.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    movementState.moveRight = false;
                    break;
            }
        });
    }
}

// Update multiplayer position after movement is applied
export function updateMultiplayerPosition() {
    if (isDesktop) {
        updatePlayerPosition(
            { 
                x: camera.position.x, 
                y: camera.position.y, 
                z: camera.position.z 
            },
            { 
                y: camera.rotation.y 
            }
        );
    }
}