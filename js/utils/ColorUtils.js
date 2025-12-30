/**
 * Color utility functions for interpolation and conversion
 */
export class ColorUtils {
    /**
     * Convert hex color to RGB object
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
     * Interpolate between two colors
     */
    static interpolate(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Get color from a gradient array based on progress (0-1)
     */
    static getGradientColor(colors, progress) {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        const colorIndex = clampedProgress * (colors.length - 1);
        const lowerIndex = Math.floor(colorIndex);
        const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
        const blend = colorIndex - lowerIndex;

        return this.interpolate(colors[lowerIndex], colors[upperIndex], blend);
    }
}
