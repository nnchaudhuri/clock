/**
 * Frame layer renderer (for future wood textures)
 */
export class FrameLayer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.frameColor = '#2a2a2a';
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

        // Frame gradient (simulating material - future: use texture)
        const frameGradient = ctx.createRadialGradient(
            centerX - 50, centerY - 50, 0,
            centerX, centerY, frameOuterRadius
        );
        frameGradient.addColorStop(0, '#4a4a4a');
        frameGradient.addColorStop(0.5, '#2a2a2a');
        frameGradient.addColorStop(1, '#1a1a1a');

        // Outer frame
        ctx.beginPath();
        ctx.arc(centerX, centerY, frameOuterRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2, true);
        ctx.fillStyle = frameGradient;
        ctx.fill();

        // Inner frame edge - same thickness as outer frame
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, innerRadius - 12, 0, Math.PI * 2, true);
        ctx.fillStyle = frameGradient;
        ctx.fill();
    }
}
