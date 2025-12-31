/**
 * Moon position and phase service using SunCalc
 */
import SunCalc from 'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/+esm';

export class MoonService {
    /**
     * Get moon data for a specific location and time
     * @param {Date} date - The date/time to calculate for
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Object} Moon position and illumination data
     */
    static getMoonData(date, lat, lng) {
        const illumination = SunCalc.getMoonIllumination(date);
        const times = SunCalc.getMoonTimes(date, lat, lng);

        return {
            // Illumination (used for rendering)
            phase: illumination.phase,        // 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
            fraction: illumination.fraction,  // 0-1, how much of moon is illuminated
            
            // Rise/Set times (used for position calculation)
            rise: times.rise,
            set: times.set
        };
    }

    /**
     * Calculate the hour angle of the moon
     * This tells us how many hours the moon is from its highest point in the sky
     * @param {Date} date - The date/time
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {number} Hour angle in hours (-12 to 12)
     */
    static getMoonHourAngle(date, lat, lng) {
        const position = SunCalc.getMoonPosition(date, lat, lng);
        
        // The azimuth from SunCalc is 0 at south, π/2 at west
        // We need to convert this to an hour angle
        // At transit (highest point), azimuth can be 0 or π depending on hemisphere
        
        // Get moon times to find transit
        const times = SunCalc.getMoonTimes(date, lat, lng);
        
        // If we have rise and set times, estimate transit as midpoint
        if (times.rise && times.set) {
            let transitTime;
            if (times.set > times.rise) {
                transitTime = new Date((times.rise.getTime() + times.set.getTime()) / 2);
            } else {
                // Moon set before rise means it spans midnight
                const setNext = new Date(times.set.getTime() + 24 * 60 * 60 * 1000);
                transitTime = new Date((times.rise.getTime() + setNext.getTime()) / 2);
            }
            
            // Hour angle is difference between current time and transit time
            const hourAngle = (date.getTime() - transitTime.getTime()) / (1000 * 60 * 60);
            return hourAngle;
        }
        
        // Fallback: estimate based on azimuth
        // This is approximate but works when rise/set times aren't available
        // Convert azimuth to hour angle (π radians = 12 hours)
        return (position.azimuth / Math.PI) * 12;
    }

    /**
     * Get the clock angle for the moon position
     * @param {Date} date - Current date/time
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} timezoneOffset - Timezone offset in hours
     * @returns {number} Angle in radians for the clock (0 = top/noon)
     */
    static getMoonClockAngle(date, lat, lng, timezoneOffset = 0) {
        const hourAngle = this.getMoonHourAngle(date, lat, lng);
        
        // Get current local hour at location
        const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
        let localHours = utcHours + timezoneOffset;
        while (localHours < 0) localHours += 24;
        while (localHours >= 24) localHours -= 24;
        
        // Moon's position on clock = current time + hour angle
        // (hour angle is positive when moon is past transit, negative before)
        let moonHours = localHours - hourAngle;
        while (moonHours < 0) moonHours += 24;
        while (moonHours >= 24) moonHours -= 24;
        
        // Convert to clock angle (noon at top)
        const adjustedHours = moonHours - 12;
        return (adjustedHours * Math.PI) / 12;
    }
}
