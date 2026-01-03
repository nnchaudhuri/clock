/**
 * Clock face layer renderer - main ring with sky arc
 */
import { ColorUtils } from '../utils/ColorUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { MoonService } from '../services/MoonService.js';

export class ClockFaceLayer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Default 12-color sequence: sun, moon, then 10 sky colors
        // Artistic palette inspired by impressionist paintings and moody atmospheres
        // Colors 0-1: Sun and Moon colors
        // Colors 2-3: Twilight (night to twilight end)
        // Colors 4-6: Sunrise (3 colors)
        // Colors 7-11: Morning to noon (5 colors)
        // Evening is automatically mirrored
        this.defaultColorSequence = [
            '#f5e8d8',  // 0: Sun (warm cream)
            '#e8e4dc',  // 1: Moon lit (soft ivory)
            '#1a1a2e',  // 2: Night (deep navy-purple)
            '#2d4059',  // 3: Twilight (slate blue)
            '#a66d8f',  // 4: Sunrise 1 (dusty mauve)
            '#d4a5a5',  // 5: Sunrise 2 (soft rose)
            '#f0c5a0',  // 6: Sunrise End (warm peach)
            '#e8dcc4',  // 7: Early Morning (warm cream)
            '#c5d8d8',  // 8: Morning (soft mint)
            '#a8c5c5',  // 9: Late Morning (muted teal)
            '#8fa5a5',  // 10: Pre-Noon (sage)
            '#7a9999'   // 11: Solar Noon (dusty teal)
        ];
        
        // Store user colors
        this.userColorSequence = [...this.defaultColorSequence];
        
        // Generate full color palettes from sequence
        this.colors = this.generateColorPalettes(this.userColorSequence);
    }

    /**
     * Set custom colors from user input (12-color array)
     */
    setCustomColors(colorSequence) {
        if (Array.isArray(colorSequence) && colorSequence.length === 12) {
            this.userColorSequence = [...colorSequence];
        } else {
            this.userColorSequence = [...this.defaultColorSequence];
        }
        this.colors = this.generateColorPalettes(this.userColorSequence);
    }

    /**
     * Generate full color palettes from 12-color sequence
     */
    generateColorPalettes(seq) {
        // Extract sun and moon colors
        const sunColor = seq[0];
        const moonColor = seq[1];
        
        // Twilight: colors 2-3 (night to twilight)
        const morningNautical = this.generateGradient(seq[2], seq[3], 10);
        
        // Sunrise: colors 3-6 (twilight end to gold)
        const morningSunrise = this.generateMultiGradient([seq[3], seq[4], seq[5], seq[6]], 25);
        
        // Midday: colors 6-11 for first half (sunrise end to noon), then mirror back
        // First half: 6 -> 11 (gold to noon blue)
        const firstHalf = this.generateMultiGradient(seq.slice(6, 12), 25);
        // Second half: 11 -> 6 (noon blue back to gold)
        const secondHalf = [...firstHalf].reverse().slice(1); // slice(1) to avoid duplicate noon color
        const middayFull = [...firstHalf, ...secondHalf];
        
        // Evening is reverse of morning
        const eveningSunset = [...morningSunrise].reverse();
        const eveningNautical = [...morningNautical].reverse();
        
        return {
            morningNautical,
            morningSunrise,
            midday: middayFull,
            eveningSunset,
            eveningNautical,
            night: seq[2],
            indicator: '#ffffff',
            sun: sunColor,
            moon: moonColor
        };
    }

    /**
     * Generate a gradient between two colors
     */
    generateGradient(color1, color2, steps) {
        const result = [];
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            result.push(ColorUtils.interpolateHex(color1, color2, t));
        }
        return result;
    }

    /**
     * Generate a gradient through multiple colors
     */
    generateMultiGradient(colors, totalSteps) {
        if (colors.length < 2) return [colors[0]];
        
        const result = [];
        const segments = colors.length - 1;
        const stepsPerSegment = Math.floor(totalSteps / segments);
        
        for (let i = 0; i < segments; i++) {
            const segmentSteps = (i === segments - 1) ? (totalSteps - result.length) : stepsPerSegment;
            for (let j = 0; j < segmentSteps; j++) {
                const t = j / segmentSteps;
                result.push(ColorUtils.interpolateHex(colors[i], colors[i + 1], t));
            }
        }
        
        // Ensure we end with the last color
        if (result.length < totalSteps) {
            result.push(colors[colors.length - 1]);
        }
        
        return result;
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

        // Draw sun on the ring (at solar noon position)
        if (state.sunData) {
            this.renderSun(dimensions, state, rotationOffset);
        }

        // Draw moon on the ring
        if (state.location) {
            this.renderMoon(dimensions, state, rotationOffset);
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

    renderSun(dimensions, state, rotationOffset) {
        const ctx = this.ctx;
        const { centerX, centerY, outerRadius, innerRadius } = dimensions;
        
        // Get sun data
        const sunData = state.sunData;
        if (!sunData || !sunData.sunrise || !sunData.sunset) return;
        
        const timezoneOffset = state.timezoneOffset || 0;
        
        // Calculate solar noon (midpoint between sunrise and sunset)
        const sunriseHours = TimeUtils.getHoursAtLocation(sunData.sunrise, timezoneOffset);
        const sunsetHours = TimeUtils.getHoursAtLocation(sunData.sunset, timezoneOffset);
        const solarNoonHours = (sunriseHours + sunsetHours) / 2;
        
        // Convert to angle using same logic as TimeUtils.getAngleAtLocation
        // (subtract 12 so noon is at top, then convert to radians)
        const adjustedHours = solarNoonHours - 12;
        let sunAngle = (adjustedHours * Math.PI) / 12;
        
        // Apply rotation offset for rotating mode
        sunAngle += rotationOffset;
        
        // Convert to canvas angle (top = -π/2)
        const canvasAngle = sunAngle - Math.PI / 2;
        
        // Position sun closer to outer edge (so it doesn't intersect moon's orbit)
        const ringWidth = outerRadius - innerRadius;
        const sunOrbitRadius = outerRadius - ringWidth * 0.28;
        const sunX = centerX + Math.cos(canvasAngle) * sunOrbitRadius;
        const sunY = centerY + Math.sin(canvasAngle) * sunOrbitRadius;
        
        // Sun size - same as moon
        const sunRadius = ringWidth * 0.18;
        
        // Draw sun circle with custom color
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.sun;
        ctx.fill();
        
        // Sun outline with same color
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.strokeStyle = this.colors.sun;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    renderMoon(dimensions, state, rotationOffset) {
        const ctx = this.ctx;
        const { centerX, centerY, outerRadius, innerRadius } = dimensions;
        
        // Create a date that combines the selected date with the current time of day
        // This way changing the date affects the moon phase, but the position still moves with time
        const selectedDate = state.date || new Date();
        const currentTime = state.currentTime || new Date();
        
        // For phase calculation, use the selected date at the current time of day
        const dateForMoon = new Date(selectedDate);
        dateForMoon.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
        
        // Get moon data using the selected date
        const moonData = MoonService.getMoonData(
            dateForMoon,
            state.location.lat,
            state.location.lng
        );
        
        // Get moon's position angle on the clock
        let moonAngle = MoonService.getMoonClockAngle(
            dateForMoon,
            state.location.lat,
            state.location.lng,
            state.timezoneOffset || 0
        );
        
        // Apply rotation offset for rotating mode
        moonAngle += rotationOffset;
        
        // Convert to canvas angle (top = -π/2)
        const canvasAngle = moonAngle - Math.PI / 2;
        
        // Position moon closer to inner edge (so it doesn't intersect sun's orbit)
        const ringWidth = outerRadius - innerRadius;
        const moonOrbitRadius = innerRadius + ringWidth * 0.28;
        const moonX = centerX + Math.cos(canvasAngle) * moonOrbitRadius;
        const moonY = centerY + Math.sin(canvasAngle) * moonOrbitRadius;
        
        // Moon size - medium-small relative to ring width
        const moonRadius = ringWidth * 0.18;
        
        // Draw the moon with phase using the illumination fraction for accuracy
        // moonData.fraction is the actual percentage illuminated (0-1)
        // moonData.phase is the phase position (0 = new, 0.5 = full)
        this.drawMoonPhase(ctx, moonX, moonY, moonRadius, moonData.phase, moonData.fraction);
    }

    drawMoonPhase(ctx, x, y, radius, phase, fraction) {
        // phase: 0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
        // fraction: 0-1, the actual illuminated percentage of the moon's visible surface
        
        ctx.save();
        
        // Handle edge cases first
        if (fraction < 0.01) {
            // New moon - all dark (uses nighttime color)
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.night;
            ctx.fill();
            ctx.restore();
            return;
        }
        
        if (fraction > 0.99) {
            // Full moon - all lit with custom color
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.moon;
            ctx.fill();
            ctx.restore();
            return;
        }
        
        // Determine if waxing or waning based on phase
        // Waxing: phase 0 to 0.5 (right side lit in Northern Hemisphere)
        // Waning: phase 0.5 to 1 (left side lit in Northern Hemisphere)
        const isWaxing = phase < 0.5;
        
        // The terminator position is determined by the illumination fraction
        // For waxing moons:
        //   fraction = 0 (new): terminator at right edge (x = +radius)
        //   fraction = 0.5 (half): terminator at center (x = 0)
        //   fraction = 1 (full): terminator at left edge (x = -radius)
        // So: terminatorX = radius * (1 - 2 * fraction)
        //
        // For fraction = 0.9 (90% lit): terminatorX = radius * (1 - 1.8) = -0.8 * radius
        // This puts the terminator on the left, leaving 90% of the moon lit on the right
        
        const terminatorX = radius * (1 - 2 * fraction);
        
        // Draw base dark moon (uses nighttime color)
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.night;
        ctx.fill();
        
        // Now draw the lit portion on top
        ctx.beginPath();
        
        if (isWaxing) {
            // Waxing: right side is lit
            // For high fraction (e.g. 0.9), terminatorX is negative (-0.8*radius), on the left
            // We draw from the terminator curve to the right edge
            
            // Start at top of terminator
            const startY = -radius;
            const startX = terminatorX * Math.sqrt(Math.max(0, 1 - (startY / radius) ** 2));
            ctx.moveTo(x + startX, y + startY);
            
            // Draw right arc from top to bottom
            ctx.arc(x, y, radius, -Math.PI / 2, Math.PI / 2, false);
            
            // Draw terminator curve from bottom back to top
            const steps = 60;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const yPos = radius - 2 * radius * t; // from radius to -radius
                const xPos = terminatorX * Math.sqrt(Math.max(0, 1 - (yPos / radius) ** 2));
                ctx.lineTo(x + xPos, y + yPos);
            }
        } else {
            // Waning: left side is lit
            // For waning, we need to mirror the terminator position
            // Waning at 30%: terminatorX was +0.4r, but we need -0.4r to draw 30% on the left
            const waningTerminatorX = -terminatorX;
            
            // Start at top of terminator
            const startY = -radius;
            const startX = waningTerminatorX * Math.sqrt(Math.max(0, 1 - (startY / radius) ** 2));
            ctx.moveTo(x + startX, y + startY);
            
            // Draw left arc from top to bottom (counterclockwise)
            ctx.arc(x, y, radius, -Math.PI / 2, Math.PI / 2, true);
            
            // Now at bottom of left arc, draw terminator curve back to top
            const steps = 60;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const yPos = radius - 2 * radius * t; // from radius to -radius (bottom to top)
                const xPos = waningTerminatorX * Math.sqrt(Math.max(0, 1 - (yPos / radius) ** 2));
                ctx.lineTo(x + xPos, y + yPos);
            }
        }
        
        ctx.closePath();
        ctx.fillStyle = this.colors.moon;
        ctx.fill();
        
        // Outline using nighttime color
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.colors.night;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore();
    }

    renderHourMarkers(dimensions, rotationOffset) {
        const ctx = this.ctx;
        const { centerX, centerY, outerRadius } = dimensions;

        ctx.save();

        for (let hour = 0; hour < 24; hour++) {
            const hourAngle = ((hour - 12) * Math.PI / 12) + rotationOffset - Math.PI / 2;

            // Differentiate midnight (0) and noon (12) ticks
            const isMidnight = hour === 0;
            const isNoon = hour === 12;
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
            
            // Color scheme: midnight (deep indigo), noon (soft sky blue), other 6-hour marks (white), regular (subtle white)
            if (isMidnight) {
                ctx.strokeStyle = '#4a5a7a'; // Deep indigo for midnight
            } else if (isNoon) {
                ctx.strokeStyle = '#a8c5d6'; // Soft sky blue for noon
            } else if (is6Hour) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            }
            ctx.lineWidth = is6Hour ? 3 : 1;
            ctx.stroke();
        }

        ctx.restore();
    }
}
