import * as THREE from 'three';
import { scene } from './sceneSetup.js';

// List of objects that can be collided with
const collidableObjects = [];

// Register an object as collidable
export function registerCollidable(object) {
    collidableObjects.push(object);
}

// Clear all existing colliders
export function clearCollidables() {
    collidableObjects.length = 0;
}

// Check if the sword mesh collides with any registered collidable objects
export function checkSwordCollision(swordMesh, forwardDirection) {
    // We'll use sword bounds for collision check
    if (!swordMesh) return { collided: false };
    
    // Create a raycaster for the sword
    const raycaster = new THREE.Raycaster();
    
    // Create an array to store all collision points
    const collisionPoints = [];
    
    // Get the world position of the sword
    const swordWorldPos = new THREE.Vector3();
    swordMesh.getWorldPosition(swordWorldPos);
    
    // Calculate dimensions based on sword geometry and scale
    const dimensions = getSwordDimensions(swordMesh);
    
    // Create sampling points along the sword for more accurate collision
    const numSamples = 5; // Number of points to check along the sword
    
    for (let i = 0; i < numSamples; i++) {
        // Calculate position along the sword (from handle to tip)
        const t = i / (numSamples - 1);
        
        // Position offset from center (adjust based on your sword dimensions)
        const offset = new THREE.Vector3(0, dimensions.height * (t - 0.5), 0);
        offset.applyQuaternion(swordMesh.getWorldQuaternion(new THREE.Quaternion()));
        
        // Sampling point position
        const samplePos = new THREE.Vector3().copy(swordWorldPos).add(offset);
        
        // Set raycaster origin and direction
        raycaster.set(
            samplePos, 
            forwardDirection.clone().normalize()
        );
        
        // Maximum check distance
        const maxDistance = dimensions.width * 0.75;
        
        // Check for intersections with all collidable objects
        const intersects = raycaster.intersectObjects(collidableObjects, true);
        
        // If we found an intersection that's closer than our threshold
        if (intersects.length > 0 && intersects[0].distance < maxDistance) {
            collisionPoints.push({
                point: intersects[0].point,
                normal: intersects[0].face ? intersects[0].face.normal : new THREE.Vector3(0, 0, 1),
                distance: intersects[0].distance,
                object: intersects[0].object
            });
        }
    }
    
    // If we have collision points, return information about the closest one
    if (collisionPoints.length > 0) {
        // Sort by distance and get closest
        collisionPoints.sort((a, b) => a.distance - b.distance);
        return {
            collided: true,
            point: collisionPoints[0].point,
            normal: collisionPoints[0].normal,
            object: collisionPoints[0].object
        };
    }
    
    // No collision
    return { collided: false };
}

// Helper to get sword dimensions based on its geometry
function getSwordDimensions(swordMesh) {
    // Use bounding box to get dimensions
    if (!swordMesh.geometry.boundingBox) {
        swordMesh.geometry.computeBoundingBox();
    }
    
    const box = swordMesh.geometry.boundingBox.clone();
    
    // Apply sword's scale to the dimensions
    return {
        width: (box.max.x - box.min.x) * swordMesh.scale.x,
        height: (box.max.y - box.min.y) * swordMesh.scale.y,
        depth: (box.max.z - box.min.z) * swordMesh.scale.z
    };
}

// Debug visualization helpers
export function createCollisionMarker(position, color = 0xff0000) {
    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    scene.add(marker);
    
    // Auto-remove after 1 second
    setTimeout(() => {
        scene.remove(marker);
    }, 1000);
    
    return marker;
}