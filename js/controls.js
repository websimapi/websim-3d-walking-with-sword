import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { camera } from './scene.js';
import { showInventory } from './inventory.js';

// Control state
export let controlsEnabled = true;
export let controls = null;

// Movement variables
export const velocity = new THREE.Vector3();
export const direction = new THREE.Vector3();
export let moveForward = false;
export let moveBackward = false;
export let moveLeft = false;
export let moveRight = false;

// Initialize controls
export function setupControls(camera, domElement) {
    controls = new PointerLockControls(camera, domElement);
    
    // Event listeners
    document.addEventListener('click', function() {
        if (!menuOpen) {
            controls.lock();
        }
    });
    
    controls.addEventListener('lock', function() {
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('inventory-container').style.display = 'none';
        menuOpen = false;
        controlsEnabled = true;
    });
    
    controls.addEventListener('unlock', function() {
        // Don't show anything on unlock
        controlsEnabled = false;
    });
    
    // Keyboard controls
    setupKeyboardControls();
    
    return controls;
}

// Menu state
export let menuOpen = false;

// Keyboard input handling
function setupKeyboardControls() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' || event.key === 'i' || event.key === 'I') {
            if (controls.isLocked) {
                controls.unlock();
                setTimeout(() => {
                    showInventory();
                    menuOpen = true;
                }, 100);
            } else if (!document.getElementById('inventory-container').style.display || 
                       document.getElementById('inventory-container').style.display === 'none') {
                showInventory();
                menuOpen = true;
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
    
    // Register mouse click for sword swinging
    document.addEventListener('mousedown', function(event) {
        // This will be implemented in sword.js
    });
}

// Update player movement - called from animation loop
export function updateMovement(delta) {
    if (!controlsEnabled) return;
    
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    
    if (moveForward || moveBackward) velocity.z -= direction.z * 20.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 20.0 * delta;
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
}