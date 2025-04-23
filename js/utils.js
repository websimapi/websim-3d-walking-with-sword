// Function to remove background from sword or arm image
export function removeSwordBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Sample multiple corner points to better identify the background color
    const sampleSize = 10; // Increased sample size
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
    
    // Determine if we're dealing with a white or blue background
    const isWhiteBackground = avgBackground.r > 200 && avgBackground.g > 200 && avgBackground.b > 200;
    const isBlueBackground = avgBackground.b > 100 && avgBackground.b > avgBackground.r * 1.5 && avgBackground.b > avgBackground.g * 1.5;
    
    // Adjust base tolerance based on background color
    let baseTolerance = 30;
    if (isWhiteBackground) {
        baseTolerance = 40; // Higher tolerance for white backgrounds
    } else if (isBlueBackground) {
        baseTolerance = 30; // Original tolerance for blue backgrounds
    }
    
    // Dynamic tolerance based on standard deviation
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
            let adjustedTolerance = dynamicTolerance * (0.7 + 0.3 * distFromCenter);
            
            // Special handling for white backgrounds (arms)
            if (isWhiteBackground) {
                // For white backgrounds, we need to preserve skin tones
                // Calculate perceived brightness
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                
                // If we're dealing with a bright pixel that's similar to the background
                if (brightness > 200 && colorDist < adjustedTolerance) {
                    // Make pixels transparent based on how close they are to the background color
                    const alpha = Math.max(0, Math.min(255, (colorDist / adjustedTolerance) * 255));
                    data[index + 3] = alpha;
                } 
                // If it's a skin tone (roughly), preserve it
                else if (r > g && g > b && r > 100 && colorDist > adjustedTolerance * 0.5) {
                    // Keep skin tones fully opaque
                    data[index + 3] = 255;
                }
                // For edge cases in white background
                else if (colorDist < adjustedTolerance * 1.5) {
                    // Create a smoother transition
                    const alpha = Math.max(0, Math.min(255, (colorDist / (adjustedTolerance * 1.5)) * 255));
                    data[index + 3] = alpha;
                }
            } 
            // Special handling for blue backgrounds (swords)
            else if (isBlueBackground) {
                // If color is close to background and not too blue (to preserve sword runes)
                if (colorDist < adjustedTolerance && b < 200) {
                    // Create a smoother transition
                    const alpha = Math.max(0, Math.min(255, (colorDist / adjustedTolerance) * 255));
                    data[index + 3] = alpha;
                }
            }
            // Generic case for any other background color
            else if (colorDist < adjustedTolerance) {
                const alpha = Math.max(0, Math.min(255, (colorDist / adjustedTolerance) * 255));
                data[index + 3] = alpha;
            }
        }
    }
    
    // Additional edge refinement pass
    const edgeThreshold = 5;
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = edgeThreshold; y < canvas.height - edgeThreshold; y++) {
        for (let x = edgeThreshold; x < canvas.width - edgeThreshold; x++) {
            const index = (y * canvas.width + x) * 4;
            
            // If pixel is semi-transparent (edge case)
            if (data[index + 3] > 30 && data[index + 3] < 220) {
                let surroundingAlpha = 0;
                let count = 0;
                
                // Check surrounding pixels
                for (let dy = -edgeThreshold; dy <= edgeThreshold; dy++) {
                    for (let dx = -edgeThreshold; dx <= edgeThreshold; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const sIndex = ((y + dy) * canvas.width + (x + dx)) * 4;
                        surroundingAlpha += tempData[sIndex + 3];
                        count++;
                    }
                }
                
                // Average alpha of surrounding pixels
                const avgAlpha = surroundingAlpha / count;
                
                // Enhance contrast at edges
                if (avgAlpha < 128) {
                    data[index + 3] = Math.max(0, data[index + 3] - 40);
                } else {
                    data[index + 3] = Math.min(255, data[index + 3] + 40);
                }
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}