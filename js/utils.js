// Function to remove background from sword image
export function removeSwordBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate center for distance weighting
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    
    // Known background color from our prompt (blue #0000FF)
    const knownBackground = { r: 0, g: 0, b: 255 };
    
    // Sample corners to verify and adjust background expectations
    const sampleSize = 5;
    const backgroundSamples = [];
    
    // Sample corners (similar to previous implementation)
    // Top-left, top-right, bottom-left, bottom-right
    for (const corner of [
        {x: 0, y: 0}, 
        {x: canvas.width - sampleSize, y: 0},
        {x: 0, y: canvas.height - sampleSize},
        {x: canvas.width - sampleSize, y: canvas.height - sampleSize}
    ]) {
        for (let y = corner.y; y < corner.y + sampleSize; y++) {
            for (let x = corner.x; x < corner.x + sampleSize; x++) {
                const index = (y * canvas.width + x) * 4;
                backgroundSamples.push({
                    r: data[index],
                    g: data[index + 1],
                    b: data[index + 2]
                });
            }
        }
    }
    
    // Calculate actual background color from samples
    const avgBackground = backgroundSamples.reduce(
        (acc, curr) => {
            acc.r += curr.r;
            acc.g += curr.g;
            acc.b += curr.b;
            return acc;
        },
        { r: 0, g: 0, b: 0 }
    );
    
    avgBackground.r /= backgroundSamples.length;
    avgBackground.g /= backgroundSamples.length;
    avgBackground.b /= backgroundSamples.length;
    
    // Process pixels with enhanced algorithm
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Distance from center (normalized 0-1)
            const distFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + 
                Math.pow(y - centerY, 2)
            ) / maxDistance;
            
            // Calculate weighted color distances
            // Blue channel gets special treatment since background is blue
            const blueChannelWeight = 1.2; // Increase weight of blue channel
            const redGreenBoost = 1.5;     // Boost non-blue channels to preserve sword details
            
            // Special case for blue runes - detect blue pixels that aren't background
            const isBlueSwordRune = b > 180 && (r > 50 || g > 50) && Math.abs(b - 255) > 30;
            
            // Calculate color distance with weighted channels
            const colorDist = Math.sqrt(
                Math.pow(r - avgBackground.r, 2) * redGreenBoost +
                Math.pow(g - avgBackground.g, 2) * redGreenBoost +
                Math.pow(b - avgBackground.b, 2) * blueChannelWeight
            );
            
            // Base tolerance adjusted for solid background
            const baseTolerance = 25; // Lower than before for more precise removal
            
            // Adjust tolerance based on distance from center
            const edgeSoftening = 0.3; // Controls edge softness
            const positionWeight = 0.7 + 0.3 * distFromCenter;
            const adjustedTolerance = baseTolerance * positionWeight;
            
            // Keep blue runes and pixels sufficiently different from background
            if (isBlueSwordRune || colorDist > adjustedTolerance) {
                // Keep pixel fully opaque
                // No change to alpha
            } else {
                // Create smooth edge transition based on color distance
                const alpha = Math.max(0, Math.min(255, (colorDist / adjustedTolerance) * 255));
                data[index + 3] = alpha;
            }
        }
    }
    
    // Apply additional edge refinement pass
    // This step smooths jagged edges and cleans up artifacts
    const refinedData = new Uint8ClampedArray(data);
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4 + 3; // Alpha channel
            
            // Skip fully transparent or fully opaque pixels
            if (data[idx] === 0 || data[idx] === 255) continue;
            
            // Average alpha with neighbors for smoother edges
            let alphaSum = 0;
            let count = 0;
            
            // Check 3x3 neighborhood
            for (let ny = -1; ny <= 1; ny++) {
                for (let nx = -1; nx <= 1; nx++) {
                    const neighborIdx = ((y + ny) * canvas.width + (x + nx)) * 4 + 3;
                    alphaSum += data[neighborIdx];
                    count++;
                }
            }
            
            // Set refined alpha value
            refinedData[idx] = alphaSum / count;
        }
    }
    
    // Apply refined data
    for (let i = 0; i < data.length; i++) {
        data[i] = refinedData[i];
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}