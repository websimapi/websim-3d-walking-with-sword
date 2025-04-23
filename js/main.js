import * as THREE from 'three';
import { setupScene, renderer, camera, composer } from './scene.js';
import { setupControls, controlsEnabled } from './controls.js';
import { initSwordSystem, updateSwordAnimation } from './sword.js';
import { initInventory } from './inventory.js';
import { clock } from './utils.js';

// Initialize the scene and renderer
setupScene();

// Initialize controls
const controls = setupControls(camera, renderer.domElement);

// Initialize sword system and inventory
initSwordSystem(camera);
initInventory(controls);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update controls and movement
    if (controlsEnabled) {
        // Movement handled in controls.js
    }
    
    // Update sword animation
    updateSwordAnimation(delta);
    
    // Render the scene
    composer.render();
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    // Update FXAA uniforms (now in scene.js)
}

// Start animation
animate();