import * as THREE from 'three';

// Create a clock for timing
export const clock = new THREE.Clock();

// Easing function for smooth animation
export function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}