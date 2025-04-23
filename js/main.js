import * as THREE from 'three';
import { initScene, renderer, composer, scene, camera } from './sceneSetup.js';
import { initControls, setupMovementControls } from './controls.js';
import { initSword, swordInventory, generateNewSword } from './sword.js';
import { initInventorySystem, showInventory } from './inventory.js';
import { setupAnimationLoop } from './animation.js';
import { initMultiplayer, room, isDesktop } from './multiplayer.js';

// Initialize scene and renderer
initScene();

// Initialize multiplayer first to detect device type
async function init() {
    try {
        // Initialize multiplayer functionality
        const { deviceType } = await initMultiplayer();
        console.log(`Running as ${deviceType} device`);
        
        // Initialize first-person controls with device-specific behavior
        const controls = initControls(camera, document.body);
        
        // Show appropriate instructions
        if (isDesktop) {
            // Initialize sword functionality (only for desktop)
            initSword(camera);
            
            // Initialize inventory system (only for desktop)
            initInventorySystem(controls);
            
            // Generate first sword and start inventory (only for desktop)
            generateNewSword();
            
            // Set up movement controls
            setupMovementControls();
        }
        
        // Set up main animation loop
        setupAnimationLoop();
        
        // Hide loading screen
        document.getElementById('loading').style.display = 'none';
        
        // Show appropriate UI
        if (isDesktop) {
            document.getElementById('instructions').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error initializing application:', error);
        document.getElementById('loading').innerHTML = `
            <h2>Error</h2>
            <p>Failed to initialize the application: ${error.message}</p>
            <button onclick="location.reload()">Try Again</button>
        `;
    }
}

// Start initialization
init();

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