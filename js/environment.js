// Environment.js - Scene setup, lighting, terrain
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three';

// Set up the environment including lighting, terrain, and background objects
export function setupEnvironment(scene, renderer) {
    // Add subtle fog to soften the distant objects
    scene.fog = new THREE.FogExp2(0x6a9cc0, 0.008); // Exponential fog with the same color as background
    
    // Set up lighting
    setupLighting(scene);
    
    // Set up ground plane
    createGround(scene);
    
    // Add decorative objects
    addRandomObjects(scene);
    
    // Load HDR environment map
    loadEnvironmentMap(scene, renderer);
}

// Set up all lights in the scene
function setupLighting(scene) {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);
    
    // Hemisphere light for sky/ground illumination
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(-5, 15, 8);
    directionalLight.castShadow = true;
    
    // Configure shadow settings
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.bias = -0.0003;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.radius = 1;
    scene.add(directionalLight);
    
    // Fill light for softer shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(5, 5, -5);
    scene.add(fillLight);
}

// Create the ground plane
function createGround(scene) {
    const planeGeometry = new THREE.PlaneGeometry(2000, 2000, 128, 128);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x339933,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1,
        envMapIntensity: 0.5
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
}

// Load HDR environment map
function loadEnvironmentMap(scene, renderer) {
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    new RGBELoader()
        .load('https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr', function(texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap;
            scene.background = new THREE.Color(0x6a9cc0); // Darker, more muted blue color
            
            texture.dispose();
            pmremGenerator.dispose();
        });
}

// Add some random objects to show off lighting effects
function addRandomObjects(scene) {
    // Add some rocks and trees
    for (let i = 0; i < 50; i++) {
        // Random position away from the player
        let x = Math.random() * 100 - 50;
        let z = Math.random() * 100 - 50;
        
        // Ensure objects aren't too close to the player
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
        
        // Create a rock or tree
        if (Math.random() > 0.5) {
            // Rock
            const rockGeometry = new THREE.DodecahedronGeometry(Math.random() * 1 + 0.5, 0);
            const rockMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.9,
                metalness: 0.1,
                envMapIntensity: 0.5
            });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(x, rockGeometry.parameters.radius * 0.5, z);
            rock.castShadow = true;
            rock.receiveShadow = true;
            scene.add(rock);
        } else {
            // Tree (simple cylinder and cone)
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                roughness: 0.9,
                metalness: 0.0
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, 0.75, z);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            
            const leavesGeometry = new THREE.ConeGeometry(1, 2, 8);
            const leavesMaterial = new THREE.MeshStandardMaterial({
                color: 0x1a472a,
                roughness: 0.8,
                metalness: 0.0
            });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.set(x, 2.5, z);
            leaves.castShadow = true;
            
            scene.add(trunk);
            scene.add(leaves);
        }
    }
}