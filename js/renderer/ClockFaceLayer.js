/**
 * Clock face layer renderer - main ring with sky arc
 */
import { ColorUtils } from '../utils/ColorUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';

export class ClockFaceLayer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Color palettes for full twilight cycle (nautical → civil → sunrise → day → sunset → civil → nautical)
        this.colors = {
            // Morning nautical twilight: deep night -> dark blue -> purple
            morningNautical: [
                '#0a0a0f', '#0d0d1a', '#101428', '#141b3d', '#182252',
                '#1c2968', '#20307e', '#243888', '#2a4099', '#3048aa'
            ],
            // Morning civil twilight to sunrise: purple -> magenta -> pink -> coral -> orange -> gold
            morningSunrise: [
                '#3048aa', '#4350b8', '#5658c6', '#6960d0', '#7d68da',
                '#9370db', '#a878e0', '#bc80e5', '#c988e8', '#d690eb',
                '#e298ed', '#ee9fee', '#f8a5ee', '#faaae8', '#fcafe0',
                '#ffb4d6', '#ffb8cc', '#ffbdc2', '#ffc1b8', '#ffc5ae',
                '#ffc9a4', '#ffcd9a', '#ffd190', '#ffd586', '#ffd97c'
            ],
            // Sunrise to midday to sunset: gold -> cream -> blue (extended) -> cream -> gold
            midday: [
                '#ffd97c', '#ffdd88', '#ffe5a0', '#feedb8', '#fef5d0',
                '#fcfde8', '#f0f8ff', '#dcedff', '#c8e2ff', '#87ceeb',
                '#75c2e9', '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7',
                '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7',
                '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7',
                '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7',
                '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7',
                '#63b6e7', '#63b6e7', '#63b6e7', '#63b6e7', '#75c2e9',
                '#87ceeb', '#c8e2ff', '#dcedff', '#f0f8ff', '#fcfde8',
                '#fef5d0', '#feedb8', '#ffe5a0', '#ffdd88', '#ffd97c'
            ],
            // Sunset to evening civil twilight: gold -> orange -> coral -> pink -> magenta -> purple
            eveningSunset: [
                '#ffd97c', '#ffd586', '#ffd190', '#ffcd9a', '#ffc9a4',
                '#ffc5ae', '#ffc1b8', '#ffbdc2', '#ffb8cc', '#ffb4d6',
                '#fcafe0', '#faaae8', '#f8a5ee', '#ee9fee', '#e298ed',
                '#d690eb', '#c988e8', '#bc80e5', '#a878e0', '#9370db',
                '#7d68da', '#6960d0', '#5658c6', '#4350b8', '#3048aa'
            ],
            // Evening nautical twilight: purple -> dark blue -> deep night
            eveningNautical: [
                '#3048aa', '#2a4099', '#243888', '#20307e', '#1c2968',
                '#182252', '#141b3d', '#101428', '#0d0d1a', '#0a0a0f'
            ],
            night: '#0a0a0f',
            indicator: '#ffffff'
        };
    }

    render(dimensions, state, rotationOffset) {
        const ctx = this.ctx;
        const { centerX, centerY, outerRadius, innerRadius } = dimensions;
        const size = centerX * 2;
        
        ctx.clearRect(0, 0, size, size);

        // Draw night (black) base ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
        ctx.fillStyle = this.colors.night;
        ctx.fill();

        // Draw daylight arc if we have sun data
        if (state.sunData) {
            this.renderDaylightArc(dimensions, state, rotationOffset);
            this.renderCenterSky(dimensions, state);
        } else {
            // No sun data yet - fill center with dark color
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius - 6, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.night;
            ctx.fill();
        }

        // Draw time indicator
        this.renderTimeIndicator(dimensions, state, rotationOffset);

        // Draw hour markers
        this.renderHourMarkers(dimensions, rotationOffset);
    }

    renderDaylightArc(dimensions, state, rotationOffset) {
        const ctx = this.ctx;
        const { centerX, centerY, outerRadius, innerRadius } = dimensions;

        if (!state.sunData) return;

        const timezoneOffset = state.timezoneOffset || 0;
        
        // Use full nautical twilight span
        const startAngle = TimeUtils.getAngleAtLocation(state.sunData.nauticalTwilightBegin, timezoneOffset) + rotationOffset;
        const endAngle = TimeUtils.getAngleAtLocation(state.sunData.nauticalTwilightEnd, timezoneOffset) + rotationOffset;
        
        // Calculate phase durations as percentages of total arc
        const phases = this.calculatePhasePercentages(state.sunData, timezoneOffset);

        // Use conic gradient if available (modern browsers)
        if (typeof ctx.createConicGradient === 'function') {
            this.renderWithConicGradient(ctx, dimensions, startAngle, endAngle, phases);
        } else {
            // Fallback to segment-based rendering with more steps
            this.renderWithSegments(ctx, dimensions, startAngle, endAngle, phases);
        }
    }

    calculatePhasePercentages(sunData, timezoneOffset) {
        // Get all times as hours at location
        const nauticalBegin = TimeUtils.getHoursAtLocation(sunData.nauticalTwilightBegin, timezoneOffset);
        const civilBegin = TimeUtils.getHoursAtLocation(sunData.civilTwilightBegin, timezoneOffset);
        const sunrise = TimeUtils.getHoursAtLocation(sunData.sunrise, timezoneOffset);
        const sunset = TimeUtils.getHoursAtLocation(sunData.sunset, timezoneOffset);
        const civilEnd = TimeUtils.getHoursAtLocation(sunData.civilTwilightEnd, timezoneOffset);
        const nauticalEnd = TimeUtils.getHoursAtLocation(sunData.nauticalTwilightEnd, timezoneOffset);
        
        const totalDuration = nauticalEnd - nauticalBegin;
        
        return {
            morningNautical: (civilBegin - nauticalBegin) / totalDuration,
            morningSunrise: (sunrise - civilBegin) / totalDuration,
            midday: (sunset - sunrise) / totalDuration,
            eveningSunset: (civilEnd - sunset) / totalDuration,
            eveningNautical: (nauticalEnd - civilEnd) / totalDuration
        };
    }

    renderWithConicGradient(ctx, dimensions, startAngle, endAngle, phases) {
        const { centerX, centerY, outerRadius, innerRadius } = dimensions;
        
        // Create conic gradient centered on the clock
        const gradient = ctx.createConicGradient(0, centerX, centerY);
        
        // Normalize angles to 0-1 range for gradient stops
        const startNorm = ((startAngle - Math.PI / 2) / (Math.PI * 2) + 1) % 1;
        const endNorm = ((endAngle - Math.PI / 2) / (Math.PI * 2) + 1) % 1;
        
        // Add color stops along the arc
        const numStops = 100;
        for (let i = 0; i <= numStops; i++) {
            const progress = i / numStops;
            const color = this.getSkyColor(progress, phases);
            
            // Calculate position in the conic gradient
            let stopPos;
            if (endNorm > startNorm) {
                stopPos = startNorm + progress * (endNorm - startNorm);
            } else {
                // Handle wrap-around
                const span = (1 - startNorm) + endNorm;
                stopPos = (startNorm + progress * span) % 1;
            }
            
            gradient.addColorStop(stopPos, color);
        }
        
        // Draw the arc using the conic gradient
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle - Math.PI / 2, endAngle - Math.PI / 2);
        ctx.arc(centerX, centerY, innerRadius, endAngle - Math.PI / 2, startAngle - Math.PI / 2, true);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    renderWithSegments(ctx, dimensions, startAngle, endAngle, phases) {
        const { centerX, centerY, outerRadius, innerRadius } = dimensions;
        
        // Use many small segments with gradient fills between adjacent colors
        const steps = 480;
        const arcSpan = endAngle - startAngle;
        const stepAngle = arcSpan / steps;
        const midRadius = (outerRadius + innerRadius) / 2;

        for (let i = 0; i < steps; i++) {
            const segStartAngle = startAngle + i * stepAngle - Math.PI / 2;
            const segEndAngle = segStartAngle + stepAngle + 0.002;

            const progress = i / steps;
            const nextProgress = (i + 1) / steps;
            const color = this.getSkyColor(progress, phases);
            const nextColor = this.getSkyColor(nextProgress, phases);

            // Create a linear gradient along the arc direction for this segment
            const x1 = centerX + Math.cos(segStartAngle) * midRadius;
            const y1 = centerY + Math.sin(segStartAngle) * midRadius;
            const x2 = centerX + Math.cos(segEndAngle) * midRadius;
            const y2 = centerY + Math.sin(segEndAngle) * midRadius;

            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, nextColor);

            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, segStartAngle, segEndAngle);
            ctx.arc(centerX, centerY, innerRadius, segEndAngle, segStartAngle, true);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    getSkyColor(progress, phases) {
        // progress: 0 = nautical twilight begin, 1 = nautical twilight end
        // phases: object with percentages for each phase
        
        const p1 = phases.morningNautical;
        const p2 = p1 + phases.morningSunrise;
        const p3 = p2 + phases.midday;
        const p4 = p3 + phases.eveningSunset;
        // p5 would be p4 + phases.eveningNautical = 1.0
        
        let colors, localProgress;
        
        if (progress < p1) {
            // Morning nautical twilight
            colors = this.colors.morningNautical;
            localProgress = progress / p1;
        } else if (progress < p2) {
            // Morning civil twilight to sunrise
            colors = this.colors.morningSunrise;
            localProgress = (progress - p1) / phases.morningSunrise;
        } else if (progress < p3) {
            // Midday
            colors = this.colors.midday;
            localProgress = (progress - p2) / phases.midday;
        } else if (progress < p4) {
            // Evening sunset to civil twilight
            colors = this.colors.eveningSunset;
            localProgress = (progress - p3) / phases.eveningSunset;
        } else {
            // Evening nautical twilight
            colors = this.colors.eveningNautical;
            localProgress = (progress - p4) / phases.eveningNautical;
        }
        
        return ColorUtils.getGradientColor(colors, localProgress);
    }

    renderCenterSky(dimensions, state) {
        const ctx = this.ctx;
        const { centerX, centerY, innerRadius } = dimensions;

        // Get current sky color based on time position
        const currentColor = this.getCurrentSkyColor(state);

        // Draw filled center circle (accounting for thicker inner frame)
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius - 12, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.fill();
    }

    getCurrentSkyColor(state) {
        const { currentTime, sunData, timezoneOffset = 0 } = state;
        
        if (!sunData) return this.colors.night;
        
        // Get hours at location
        const currentHours = TimeUtils.getHoursAtLocation(currentTime, timezoneOffset);
        const nauticalBeginHours = TimeUtils.getHoursAtLocation(sunData.nauticalTwilightBegin, timezoneOffset);
        const nauticalEndHours = TimeUtils.getHoursAtLocation(sunData.nauticalTwilightEnd, timezoneOffset);

        // Night time - before or after nautical twilight
        if (currentHours < nauticalBeginHours || currentHours > nauticalEndHours) {
            return this.colors.night;
        }

        // Calculate progress through full twilight cycle (0 = nautical begin, 1 = nautical end)
        const progress = (currentHours - nauticalBeginHours) / (nauticalEndHours - nauticalBeginHours);
        
        // Calculate phase percentages
        const phases = this.calculatePhasePercentages(sunData, timezoneOffset);

        return this.getSkyColor(progress, phases);
    }

    renderTimeIndicator(dimensions, state, rotationOffset) {
        const ctx = this.ctx;
        const { centerX, centerY, outerRadius, innerRadius } = dimensions;

        let angle;
        if (state.mode === 'fixed') {
            // Use timezone-aware angle for fixed mode
            angle = TimeUtils.getAngleAtLocation(state.currentTime, state.timezoneOffset || 0) - Math.PI / 2;
        } else {
            angle = -Math.PI / 2;
        }

        const indicatorWidth = 4;

        const innerX = centerX + Math.cos(angle) * (innerRadius + 3);
        const innerY = centerY + Math.sin(angle) * (innerRadius + 3);
        const outerX = centerX + Math.cos(angle) * (outerRadius - 3);
        const outerY = centerY + Math.sin(angle) * (outerRadius - 3);

        // Draw simple white indicator line
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.strokeStyle = this.colors.indicator;
        ctx.lineWidth = indicatorWidth;
        ctx.lineCap = 'butt';
        ctx.stroke();
    }

    renderHourMarkers(dimensions, rotationOffset) {
        const ctx = this.ctx;
        const { centerX, centerY, outerRadius } = dimensions;

        ctx.save();

        for (let hour = 0; hour < 24; hour++) {
            const hourAngle = ((hour - 12) * Math.PI / 12) + rotationOffset - Math.PI / 2;

            // Tick dimensions - bolder for 6-hour intervals
            const is6Hour = hour % 6 === 0;
            const tickInner = outerRadius + 6;
            const tickOuter = outerRadius + (is6Hour ? 18 : 12);
            
            const x1 = centerX + Math.cos(hourAngle) * tickInner;
            const y1 = centerY + Math.sin(hourAngle) * tickInner;
            const x2 = centerX + Math.cos(hourAngle) * tickOuter;
            const y2 = centerY + Math.sin(hourAngle) * tickOuter;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = is6Hour ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = is6Hour ? 3 : 1;
            ctx.stroke();
        }

        ctx.restore();
    }
}
