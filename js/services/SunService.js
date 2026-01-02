/**
 * Sunrise/sunset data service using SunCalc (local calculation)
 */
import SunCalc from 'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/+esm';

export class SunService {
    /**
     * Calculate sun data locally using SunCalc library
     * Returns sunrise, sunset, and twilight times
     */
    static getSunData(lat, lng, date) {
        // SunCalc calculates times for the given date
        const times = SunCalc.getTimes(date, lat, lng);

        return {
            sunrise: times.sunrise,
            sunset: times.sunset,
            solarNoon: times.solarNoon,
            civilTwilightBegin: times.dawn,           // Civil twilight start
            civilTwilightEnd: times.dusk,             // Civil twilight end
            nauticalTwilightBegin: times.nauticalDawn, // Nautical twilight start
            nauticalTwilightEnd: times.nauticalDusk,   // Nautical twilight end
            dayLength: times.sunset - times.sunrise    // Duration in milliseconds
        };
    }
}
