/**
 * Location and geocoding services
 */
export class LocationService {
    /**
     * Get user's current location via browser geolocation
     */
    static async getCurrentPosition() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation not supported');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        name: `${position.coords.latitude.toFixed(2)}°, ${position.coords.longitude.toFixed(2)}°`
                    });
                },
                reject,
                { timeout: 10000, enableHighAccuracy: false }
            );
        });
    }

    /**
     * Parse coordinates from string (lat,lng format)
     */
    static parseCoordinates(input) {
        const coordMatch = input.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            return {
                lat,
                lng,
                name: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`
            };
        }
        return null;
    }

    /**
     * Geocode a location name to coordinates
     */
    static async geocode(query) {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );
        const data = await response.json();

        if (data.length === 0) {
            throw new Error('Location not found');
        }

        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            name: data[0].display_name.split(',').slice(0, 2).join(',')
        };
    }

    /**
     * Get default location (New York)
     */
    static getDefault() {
        return {
            lat: 40.7128,
            lng: -74.0060,
            name: 'New York, NY'
        };
    }
}
