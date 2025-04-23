import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// Exported variables for use in other modules
export let scene, camera, renderer, composer, fxaaPass;

export function initScene() {
    // Scene setup
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.7; // Eye height
    scene.add(camera);
    
    // Renderer setup with improved settings
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
    renderer.toneMappingExposure = 0.8; // Reduced from 1.2 to 0.8 to decrease overall brightness
    
    // Improved shadow settings
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    document.body.appendChild(renderer.domElement);
    
    // Post-processing setup with focus on high-quality shadows
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // FXAA for anti-aliasing
    fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
    composer.addPass(fxaaPass);
    
    // Selective bloom effect for the sword - reduced strength
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.6,  // strength - reduced from 0.8 to 0.6
        0.3,  // radius
        0.4   // threshold
    );
    composer.addPass(bloomPass);
    
    // Final output pass
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    
    // Load HDR environment map
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
    
    setupLighting();
    setupEnvironment();
}

function setupLighting() {
    // Add subtle fog to soften the distant objects
    scene.fog = new THREE.FogExp2(0x6a9cc0, 0.008); // Exponential fog with the same color as background
    
    // Enhanced lighting setup for better shadows
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3); // Slightly increased ambient
    scene.add(ambientLight);
    
    // Hemisphere light for sky/ground illumination
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(-5, 15, 8);
    directionalLight.castShadow = true;
    
    // Higher resolution shadow map for sharper shadows
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.bias = -0.0003; // Reduced bias for sharper shadows
    directionalLight.shadow.mapSize.width = 4096; // Increased resolution
    directionalLight.shadow.mapSize.height = 4096; // Increased resolution
    directionalLight.shadow.radius = 1; // Smaller radius for sharper shadows
    scene.add(directionalLight);
    
    // Add a fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(5, 5, -5);
    scene.add(fillLight);
    
    // Add a spotlight specifically to highlight the sword
    const swordLight = new THREE.SpotLight(0x7777ff, 2.0);
    swordLight.position.set(0, 3, 0);
    swordLight.angle = Math.PI / 6;
    swordLight.penumbra = 0.2;
    swordLight.decay = 2;
    swordLight.distance = 10;
    camera.add(swordLight);
    swordLight.target = camera;
}

function setupEnvironment() {
    // Ground plane with PBR material
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
    
    addRandomObjects();
}

function addRandomObjects() {
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