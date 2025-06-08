// Function to remove background from sword image
export function removeSwordBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert RGB to HSV for better color matching
    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        if (diff !== 0) {
            if (max === r) h = ((g - b) / diff) % 6;
            else if (max === g) h = (b - r) / diff + 2;
            else h = (r - g) / diff + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : diff / max;
        const v = max;
        
        return { h, s: s * 100, v: v * 100 };
    }
    
    // Sample edges more comprehensively
    const edgePixels = [];
    const sampleWidth = Math.min(10, Math.floor(canvas.width * 0.1));
    const sampleHeight = Math.min(10, Math.floor(canvas.height * 0.1));
    
    // Sample all four edges
    for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < sampleHeight; y++) {
            edgePixels.push({x, y}); // Top edge
            edgePixels.push({x, y: canvas.height - 1 - y}); // Bottom edge
        }
    }
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < sampleWidth; x++) {
            edgePixels.push({x, y}); // Left edge
            edgePixels.push({x: canvas.width - 1 - x, y}); // Right edge
        }
    }
    
    // Analyze edge pixels to determine background characteristics
    const backgroundSamples = edgePixels.map(({x, y}) => {
        const index = (y * canvas.width + x) * 4;
        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            hsv: rgbToHsv(data[index], data[index + 1], data[index + 2])
        };
    });
    
    // Find the most common background color using clustering
    const backgroundColor = findDominantBackgroundColor(backgroundSamples);
    
    // Create a mask using flood fill from edges
    const mask = new Uint8Array(canvas.width * canvas.height);
    mask.fill(255); // Start with all opaque
    
    // Flood fill from edges to mark background pixels
    const visited = new Set();
    const queue = [...edgePixels];
    
    while (queue.length > 0) {
        const {x, y} = queue.shift();
        const key = y * canvas.width + x;
        
        if (visited.has(key) || x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
            continue;
        }
        
        visited.add(key);
        const index = (y * canvas.width + x) * 4;
        const pixel = {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            hsv: rgbToHsv(data[index], data[index + 1], data[index + 2])
        };
        
        // Check if this pixel matches the background
        if (isBackgroundPixel(pixel, backgroundColor)) {
            mask[key] = 0; // Mark as transparent
            
            // Add neighbors to queue
            for (const [dx, dy] of [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]]) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                    queue.push({x: nx, y: ny});
                }
            }
        }
    }
    
    // Apply mask with edge smoothing
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const key = y * canvas.width + x;
            const index = (y * canvas.width + x) * 4;
            
            if (mask[key] === 0) {
                data[index + 3] = 0; // Fully transparent
            } else {
                // Check for edge pixels and apply anti-aliasing
                const edgeAlpha = calculateEdgeAlpha(x, y, mask, canvas.width, canvas.height);
                data[index + 3] = Math.min(255, data[index + 3] * edgeAlpha);
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

function findDominantBackgroundColor(samples) {
    // Group similar colors together
    const clusters = [];
    const tolerance = 30;
    
    samples.forEach(sample => {
        let foundCluster = false;
        
        for (const cluster of clusters) {
            const colorDist = Math.sqrt(
                Math.pow(sample.r - cluster.avgColor.r, 2) +
                Math.pow(sample.g - cluster.avgColor.g, 2) +
                Math.pow(sample.b - cluster.avgColor.b, 2)
            );
            
            if (colorDist < tolerance) {
                cluster.samples.push(sample);
                // Update average
                cluster.avgColor.r = cluster.samples.reduce((sum, s) => sum + s.r, 0) / cluster.samples.length;
                cluster.avgColor.g = cluster.samples.reduce((sum, s) => sum + s.g, 0) / cluster.samples.length;
                cluster.avgColor.b = cluster.samples.reduce((sum, s) => sum + s.b, 0) / cluster.samples.length;
                cluster.avgColor.hsv = rgbToHsv(cluster.avgColor.r, cluster.avgColor.g, cluster.avgColor.b);
                foundCluster = true;
                break;
            }
        }
        
        if (!foundCluster) {
            clusters.push({
                samples: [sample],
                avgColor: { ...sample }
            });
        }
    });
    
    // Return the largest cluster (most common background color)
    return clusters.reduce((largest, current) => 
        current.samples.length > largest.samples.length ? current : largest
    ).avgColor;
}

function isBackgroundPixel(pixel, backgroundRef) {
    // Multi-criteria matching for better accuracy
    
    // RGB distance check
    const rgbDistance = Math.sqrt(
        Math.pow(pixel.r - backgroundRef.r, 2) +
        Math.pow(pixel.g - backgroundRef.g, 2) +
        Math.pow(pixel.b - backgroundRef.b, 2)
    );
    
    // HSV checks for better color space matching
    const hueDiff = Math.min(
        Math.abs(pixel.hsv.h - backgroundRef.hsv.h),
        360 - Math.abs(pixel.hsv.h - backgroundRef.hsv.h)
    );
    const satDiff = Math.abs(pixel.hsv.s - backgroundRef.hsv.s);
    const valDiff = Math.abs(pixel.hsv.v - backgroundRef.hsv.v);
    
    // Multiple tolerance checks
    const rgbTolerance = 35;
    const hueTolerance = 15;
    const satTolerance = 20;
    const valTolerance = 25;
    
    // Special handling for blue backgrounds (expected color)
    const isBlueish = pixel.hsv.h >= 200 && pixel.hsv.h <= 260 && pixel.hsv.s > 70;
    const isBackgroundBlue = backgroundRef.hsv.h >= 200 && backgroundRef.hsv.h <= 260;
    
    if (isBackgroundBlue && isBlueish) {
        // More lenient for blue-to-blue matching
        return rgbDistance < rgbTolerance + 15 || 
               (hueDiff < hueTolerance + 10 && satDiff < satTolerance + 15 && valDiff < valTolerance + 15);
    }
    
    // General matching criteria
    return rgbDistance < rgbTolerance || 
           (hueDiff < hueTolerance && satDiff < satTolerance && valDiff < valTolerance);
}

function calculateEdgeAlpha(x, y, mask, width, height) {
    // Check surrounding pixels for edge detection
    let opaqueCount = 0;
    let totalCount = 0;
    
    const radius = 2;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const key = ny * width + nx;
                if (mask[key] > 0) opaqueCount++;
                totalCount++;
            }
        }
    }
    
    // Return alpha based on ratio of opaque neighbors
    const ratio = opaqueCount / totalCount;
    
    // Smooth transition for edges
    if (ratio < 0.3) return 0.0;
    if (ratio > 0.8) return 1.0;
    
    // Smooth interpolation for edge pixels
    return (ratio - 0.3) / 0.5;
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    if (diff !== 0) {
        if (max === r) h = ((g - b) / diff) % 6;
        else if (max === g) h = (b - r) / diff + 2;
        else h = (r - g) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : diff / max;
    const v = max;
    
    return { h, s: s * 100, v: v * 100 };
}