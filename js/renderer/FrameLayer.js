/**
 * Frame layer renderer
 */
export class FrameLayer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.frameColor = '#2a2a2a';
        this.cachedGradient = null;
        this.lastDimensions = null;
    }

    render(dimensions) {
        const ctx = this.ctx;
        const { centerX, centerY, outerRadius, innerRadius } = dimensions;
        const size = centerX * 2;
        
        ctx.clearRect(0, 0, size, size);

        const frameWidth = 12;
        const frameOuterRadius = outerRadius + frameWidth;

        // Frame shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, frameOuterRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, innerRadius - 5, 0, Math.PI * 2, true);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 25;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = this.frameColor;
        ctx.fill();
        ctx.restore();

        // Cache gradient if dimensions changed
        if (!this.cachedGradient || 
            !this.lastDimensions ||
            this.lastDimensions.centerX !== centerX ||
            this.lastDimensions.centerY !== centerY ||
            this.lastDimensions.outerRadius !== outerRadius) {
            
            this.cachedGradient = ctx.createRadialGradient(
                centerX - 50, centerY - 50, 0,
                centerX, centerY, frameOuterRadius
            );
            this.cachedGradient.addColorStop(0, '#4a4a4a');
            this.cachedGradient.addColorStop(0.5, '#2a2a2a');
            this.cachedGradient.addColorStop(1, '#1a1a1a');
            
            this.lastDimensions = { centerX, centerY, outerRadius };
        }

        // Outer frame
        ctx.beginPath();
        ctx.arc(centerX, centerY, frameOuterRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2, true);
        ctx.fillStyle = this.cachedGradient;
        ctx.fill();

        // Inner frame edge - same thickness as outer frame
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, innerRadius - 12, 0, Math.PI * 2, true);
        ctx.fillStyle = this.cachedGradient;
        ctx.fill();
    }
}
