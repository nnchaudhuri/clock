/**
 * Sunrise/sunset data service
 */
export class SunService {
    /**
     * Fetch sun data from API
     * Returns sunrise, sunset, and twilight times
     */
    static async fetchSunData(lat, lng, date) {
        const dateStr = date.toISOString().split('T')[0];

        const response = await fetch(
            `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`
        );
        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error('Failed to fetch sun data');
        }

        return {
            sunrise: new Date(data.results.sunrise),
            sunset: new Date(data.results.sunset),
            solarNoon: new Date(data.results.solar_noon),
            civilTwilightBegin: new Date(data.results.civil_twilight_begin),
            civilTwilightEnd: new Date(data.results.civil_twilight_end),
            nauticalTwilightBegin: new Date(data.results.nautical_twilight_begin),
            nauticalTwilightEnd: new Date(data.results.nautical_twilight_end),
            dayLength: data.results.day_length
        };
    }

    /**
     * Calculate twilight durations in hours
     */
    static getTwilightDurations(sunData) {
        const sunriseDuration = (sunData.sunrise - sunData.civilTwilightBegin) / 3600000; // hours
        const sunsetDuration = (sunData.civilTwilightEnd - sunData.sunset) / 3600000; // hours
        const dayLength = (sunData.sunset - sunData.sunrise) / 3600000; // hours

        return {
            sunriseDuration,
            sunsetDuration,
            dayLength,
            // Calculate what percentage of daylight the twilight periods represent
            sunrisePercent: sunriseDuration / dayLength,
            sunsetPercent: sunsetDuration / dayLength
        };
    }
}
