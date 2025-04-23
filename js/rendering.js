// Rendering.js - Post-processing and rendering effects
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// Set up post-processing effects
export function setupPostProcessing(renderer, scene, camera) {
    // Create composer for post-processing
    const composer = new EffectComposer(renderer);
    
    // Add standard render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Add FXAA for anti-aliasing
    const fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
    composer.addPass(fxaaPass);
    
    // Add bloom effect for sword glow
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.6,  // strength
        0.3,  // radius
        0.4   // threshold
    );
    composer.addPass(bloomPass);
    
    // Add final output pass
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    
    // Handle window resize for post-processing
    window.addEventListener('resize', function(e) {
        if (e.detail && e.detail.renderer) {
            const pixelRatio = e.detail.renderer.getPixelRatio();
            fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
            fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
        }
    });
    
    return composer;
}