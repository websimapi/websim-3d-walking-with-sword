import * as THREE from 'three';
import { initScene, renderer, composer, scene, camera } from './sceneSetup.js';
import { initControls, setupMovementControls } from './controls.js';
import { initSword, swordInventory, generateNewSword, generateArmImage } from './sword.js';
import { initInventorySystem, showInventory } from './inventory.js';
import { setupAnimationLoop } from './animation.js';

// Initialize scene and renderer
initScene();

// Initialize first-person controls
const controls = initControls(camera, document.body);

// Initialize sword functionality
initSword(camera);

// Initialize inventory system
initInventorySystem(controls);

// Set up movement controls
setupMovementControls();

// Generate first sword and arm
generateNewSword();
generateArmImage();

// Set up main animation loop
setupAnimationLoop();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    // Update FXAA uniforms from sceneSetup
    const pixelRatio = renderer.getPixelRatio();
    
    // Access the FXAA pass from sceneSetup
    const fxaaPass = composer.passes.find(pass => pass.material && pass.material.uniforms && pass.material.uniforms['resolution']);
    
    if (fxaaPass) {
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
    }
}