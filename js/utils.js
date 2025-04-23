// Utils.js - Utility functions and helpers

// Easing function for smooth animation
export function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Utility to calculate color distance
export function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
    );
}

// Generate a random number between min and max
export function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Clamp a value between min and max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Linear interpolation
export function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Calculate the average of an array of numbers
export function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Calculate the standard deviation of an array of numbers
export function standardDeviation(arr) {
    const avg = average(arr);
    const squareDiffs = arr.map(value => {
        const diff = value - avg;
        return diff * diff;
    });
    return Math.sqrt(average(squareDiffs));
}