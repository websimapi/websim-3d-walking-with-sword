// Main.js - Core setup and initialization
import * as THREE from 'three';
import { setupEnvironment } from './environment.js';
import { setupControls } from './controls.js';
import { initSwordSystem } from './sword.js';
import { setupPostProcessing } from './rendering.js';

// Core scene variables
let scene, camera, renderer, clock, composer;

// Initialize the application
function init() {
    // Create the scene
    scene = new THREE.Scene();
    
    // Set up the camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.7; // Eye height
    scene.add(camera);
    
    // Create the renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Enable physically correct lighting
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    
    // Improved shadow settings
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    document.body.appendChild(renderer.domElement);

    // Create the clock for delta time
    clock = new THREE.Clock();
    
    // Setup the environment (lighting, terrain, etc)
    setupEnvironment(scene);
    
    // Setup post-processing
    composer = setupPostProcessing(renderer, scene, camera);
    
    // Setup controls and movement
    const controls = setupControls(camera, scene);
    
    // Initialize sword system
    initSwordSystem(camera, scene, controls);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Start the animation loop
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    // Update all systems that need animation
    window.dispatchEvent(new CustomEvent('animate', { detail: { delta, clock } }));
    
    // Render the scene
    composer.render();
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    // Update any custom resize handlers
    window.dispatchEvent(new CustomEvent('resize', { 
        detail: { 
            width: window.innerWidth, 
            height: window.innerHeight,
            renderer: renderer
        } 
    }));
}

// Start the application
init();

// Export variables that need to be accessed by other modules
export { scene, camera, renderer, composer, clock };