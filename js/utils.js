// Function to remove background from sword image
export function removeSwordBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Sample multiple corner points to better identify the background color
    const sampleSize = 5; // Number of pixels to sample from each corner
    const backgroundSamples = [];
    
    // Sample top-left corner
    for (let y = 0; y < sampleSize; y++) {
        for (let x = 0; x < sampleSize; x++) {
            const index = (y * canvas.width + x) * 4;
            backgroundSamples.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    // Sample top-right corner
    for (let y = 0; y < sampleSize; y++) {
        for (let x = canvas.width - sampleSize; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            backgroundSamples.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    // Sample bottom-left corner
    for (let y = canvas.height - sampleSize; y < canvas.height; y++) {
        for (let x = 0; x < sampleSize; x++) {
            const index = (y * canvas.width + x) * 4;
            backgroundSamples.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    // Sample bottom-right corner
    for (let y = canvas.height - sampleSize; y < canvas.height; y++) {
        for (let x = canvas.width - sampleSize; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            backgroundSamples.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    // Calculate the average background color
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
    
    // Calculate standard deviation to determine a dynamic tolerance
    const stdDev = backgroundSamples.reduce(
        (acc, curr) => {
            acc.r += Math.pow(curr.r - avgBackground.r, 2);
            acc.g += Math.pow(curr.g - avgBackground.g, 2);
            acc.b += Math.pow(curr.b - avgBackground.b, 2);
            return acc;
        },
        { r: 0, g: 0, b: 0 }
    );
    
    stdDev.r = Math.sqrt(stdDev.r / backgroundSamples.length);
    stdDev.g = Math.sqrt(stdDev.g / backgroundSamples.length);
    stdDev.b = Math.sqrt(stdDev.b / backgroundSamples.length);
    
    // Base tolerance on the standard deviation, with a minimum value
    const baseTolerance = 30;
    const dynamicTolerance = Math.max(
        baseTolerance,
        (stdDev.r + stdDev.g + stdDev.b) / 3 * 2
    );
    
    // Keep track of center coordinates for distance-based weighting
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    
    // Process pixels with position-aware algorithm
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Calculate color distance from background
            const colorDist = Math.sqrt(
                Math.pow(r - avgBackground.r, 2) +
                Math.pow(g - avgBackground.g, 2) +
                Math.pow(b - avgBackground.b, 2)
            );
            
            // Calculate physical distance from center (normalized to 0-1)
            const distFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + 
                Math.pow(y - centerY, 2)
            ) / maxDistance;
            
            // Adjust tolerance based on distance from center
            // Pixels closer to the center get a lower tolerance (are more likely to be kept)
            const adjustedTolerance = dynamicTolerance * (0.7 + 0.3 * distFromCenter);
            
            // If color is close to background and not too blue (to preserve sword runes)
            if (colorDist < adjustedTolerance && b < 200) {
                // Make more transparent the closer it is to the background color
                // This creates a smoother edge
                const alpha = Math.max(0, Math.min(255, (colorDist / adjustedTolerance) * 255));
                data[index + 3] = alpha;
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}