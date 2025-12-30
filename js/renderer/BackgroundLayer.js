/**
 * Background layer renderer (for future wall textures)
 */
export class BackgroundLayer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    render(dimensions) {
        const { centerX, centerY } = dimensions;
        const size = centerX * 2;
        
        this.ctx.clearRect(0, 0, size, size);
        
        // Simple dark background
        // Future: Replace with wall texture image
        this.ctx.fillStyle = '#0a0a12';
        this.ctx.fillRect(0, 0, size, size);
    }
}
