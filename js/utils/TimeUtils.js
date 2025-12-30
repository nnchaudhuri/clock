/**
 * Time calculation utilities
 */
export class TimeUtils {
    /**
     * Get hours value for the location's timezone (for display/angle purposes)
     * Returns a fractional hour value 0-24
     */
    static getHoursAtLocation(date, timezoneOffset = 0) {
        // Get UTC hours
        const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        // Apply timezone offset
        let localHours = utcHours + timezoneOffset;
        // Normalize to 0-24
        while (localHours < 0) localHours += 24;
        while (localHours >= 24) localHours -= 24;
        return localHours;
    }

    /**
     * Get angle for the current time at a location (using timezone offset)
     */
    static getAngleAtLocation(date, timezoneOffset = 0) {
        const localHours = this.getHoursAtLocation(date, timezoneOffset);
        const adjustedHours = localHours - 12;
        return (adjustedHours * Math.PI) / 12;
    }

    /**
     * Format current time as HH:MM:SS for display at a location
     */
    static formatCurrentTimeAtLocation(timezoneOffset = 0) {
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const utcSeconds = now.getUTCSeconds();
        
        let localHours = utcHours + timezoneOffset;
        while (localHours < 0) localHours += 24;
        while (localHours >= 24) localHours -= 24;
        
        const hours = Math.floor(localHours).toString().padStart(2, '0');
        const minutes = utcMinutes.toString().padStart(2, '0');
        const seconds = utcSeconds.toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Format time as HH:MM (in the location's timezone)
     */
    static formatTime(date, timezoneOffset = null) {
        if (!date) return '--:--';
        
        if (timezoneOffset !== null) {
            // Convert to location's timezone
            const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
            const locationTime = new Date(utcTime + timezoneOffset * 3600000);
            const hours = locationTime.getHours().toString().padStart(2, '0');
            const minutes = locationTime.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Calculate duration in hours and minutes
     */
    static formatDuration(milliseconds) {
        const hours = Math.floor(milliseconds / 3600000);
        const minutes = Math.floor((milliseconds % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }
}
