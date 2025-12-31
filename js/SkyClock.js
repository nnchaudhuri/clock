/**
 * Sky Clock - Main controller class
 */
import { LocationService } from './services/LocationService.js';
import { SunService } from './services/SunService.js';
import { TimeUtils } from './utils/TimeUtils.js';
import { BackgroundLayer } from './renderer/BackgroundLayer.js';
import { FrameLayer } from './renderer/FrameLayer.js';
import { ClockFaceLayer } from './renderer/ClockFaceLayer.js';

export class SkyClock {
    constructor() {
        // Canvas layers
        this.layers = {
            background: new BackgroundLayer(document.getElementById('backgroundLayer')),
            frame: new FrameLayer(document.getElementById('frameLayer')),
            clockFace: new ClockFaceLayer(document.getElementById('clockFaceLayer'))
        };

        // Clock state
        this.state = {
            mode: 'rotating',
            location: null,
            locationName: '',
            date: new Date(),
            sunData: null,
            currentTime: new Date(),
            timezoneOffset: 0  // Offset in hours from UTC for the location
        };

        // Clock dimensions
        this.dimensions = {
            centerX: 0,
            centerY: 0,
            outerRadius: 0,
            innerRadius: 0,
            ringWidth: 0
        };

        this.animationId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.resizeCanvases();
        this.setDefaultDate();
        this.tryGetUserLocation();
        this.startAnimation();

        window.addEventListener('resize', () => this.resizeCanvases());
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('menuPanel').classList.toggle('open');
            document.getElementById('menuToggle').classList.toggle('open');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('menuPanel');
            const toggle = document.getElementById('menuToggle');
            if (!menu.contains(e.target) && !toggle.contains(e.target)) {
                menu.classList.remove('open');
                toggle.classList.remove('open');
            }
        });

        // Location search
        document.getElementById('searchBtn').addEventListener('click', () => this.searchLocation());
        document.getElementById('locationInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation();
        });

        // Use my location
        document.getElementById('useMyLocation').addEventListener('click', () => this.tryGetUserLocation());

        // Date input change
        document.getElementById('dateInput').addEventListener('change', (e) => this.handleDateChange(e.target.value));
        document.getElementById('dateInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleDateChange(e.target.value);
        });

        // Mode toggle
        document.getElementById('fixedModeBtn').addEventListener('click', () => this.setMode('fixed'));
        document.getElementById('rotatingModeBtn').addEventListener('click', () => this.setMode('rotating'));
    }

    handleDateChange(value) {
        const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateMatch) {
            this.state.date = new Date(value + 'T12:00:00');
            // Fetch new sun data - don't clear existing data to avoid flicker
            this.fetchSunData();
        }
    }

    setDefaultDate() {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        document.getElementById('dateInput').value = dateStr;
        this.state.date = today;
    }

    resizeCanvases() {
        const container = document.querySelector('.clock-container');
        const size = Math.min(container.offsetWidth, container.offsetHeight);
        const dpr = window.devicePixelRatio || 1;

        const canvases = [
            document.getElementById('backgroundLayer'),
            document.getElementById('frameLayer'),
            document.getElementById('clockFaceLayer')
        ];

        canvases.forEach(canvas => {
            canvas.width = size * dpr;
            canvas.height = size * dpr;
            canvas.style.width = size + 'px';
            canvas.style.height = size + 'px';
            canvas.getContext('2d').scale(dpr, dpr);
        });

        this.dimensions = {
            centerX: size / 2,
            centerY: size / 2,
            outerRadius: size * 0.42,
            innerRadius: size * 0.26,
            ringWidth: size * 0.16
        };

        this.render();
    }

    async tryGetUserLocation() {
        try {
            const location = await LocationService.getCurrentPosition();
            this.state.location = { lat: location.lat, lng: location.lng };
            this.state.locationName = location.name;
            // Calculate timezone offset from longitude (approximate: 15 degrees = 1 hour)
            this.state.timezoneOffset = Math.round(location.lng / 15);
            document.getElementById('locationDisplay').textContent = location.name;
            this.fetchSunData();
        } catch (error) {
            console.log('Could not get location:', error.message);
            this.setDefaultLocation();
        }
    }

    setDefaultLocation() {
        const location = LocationService.getDefault();
        this.state.location = { lat: location.lat, lng: location.lng };
        this.state.locationName = location.name;
        // Calculate timezone offset from longitude
        this.state.timezoneOffset = Math.round(location.lng / 15);
        document.getElementById('locationDisplay').textContent = location.name;
        this.fetchSunData();
    }

    async searchLocation() {
        const input = document.getElementById('locationInput').value.trim();
        if (!input) return;

        // Try parsing as coordinates first
        const coords = LocationService.parseCoordinates(input);
        if (coords) {
            this.state.location = { lat: coords.lat, lng: coords.lng };
            this.state.locationName = coords.name;
            // Calculate timezone offset from longitude
            this.state.timezoneOffset = Math.round(coords.lng / 15);
            document.getElementById('locationDisplay').textContent = coords.name;
            this.fetchSunData();
            return;
        }

        // Try geocoding
        try {
            const location = await LocationService.geocode(input);
            this.state.location = { lat: location.lat, lng: location.lng };
            this.state.locationName = location.name;
            // Calculate timezone offset from longitude
            this.state.timezoneOffset = Math.round(location.lng / 15);
            document.getElementById('locationDisplay').textContent = location.name;
            this.fetchSunData();
        } catch (error) {
            alert('Location not found. Try entering coordinates (lat,lng).');
        }
    }

    async fetchSunData() {
        if (!this.state.location) return;

        try {
            const sunData = await SunService.fetchSunData(
                this.state.location.lat,
                this.state.location.lng,
                this.state.date
            );

            this.state.sunData = sunData;
            this.updateInfoPanel();
        } catch (error) {
            console.error('Error fetching sun data:', error);
        }
    }

    updateInfoPanel() {
        const tzOffset = this.state.timezoneOffset;
        const sunData = this.state.sunData;
        
        if (sunData) {
            document.getElementById('sunriseDisplay').textContent = TimeUtils.formatTime(sunData.sunrise, tzOffset);
            document.getElementById('sunsetDisplay').textContent = TimeUtils.formatTime(sunData.sunset, tzOffset);
            const dayLength = sunData.sunset - sunData.sunrise;
            document.getElementById('dayLengthDisplay').textContent = TimeUtils.formatDuration(dayLength);
        } else {
            document.getElementById('sunriseDisplay').textContent = '--:--';
            document.getElementById('sunsetDisplay').textContent = '--:--';
            document.getElementById('dayLengthDisplay').textContent = '--';
        }
        
        this.updateCurrentTimeDisplay();
    }

    setMode(mode) {
        if (this.state.mode === mode) return;

        this.state.mode = mode;

        document.getElementById('fixedModeBtn').classList.toggle('active', mode === 'fixed');
        document.getElementById('rotatingModeBtn').classList.toggle('active', mode === 'rotating');
        document.getElementById('modeDescription').textContent = 
            mode === 'fixed' 
                ? 'Noon at top, time indicator rotates' 
                : 'Current time at top, arc rotates';
    }

    startAnimation() {
        const animate = () => {
            // Keep current time as real UTC time for proper comparisons
            this.state.currentTime = new Date();
            this.updateCurrentTimeDisplay();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    updateCurrentTimeDisplay() {
        // Display the time at the location using timezone offset
        document.getElementById('currentTimeDisplay').textContent = 
            TimeUtils.formatCurrentTimeAtLocation(this.state.timezoneOffset);
    }

    render() {
        let rotationOffset = 0;
        if (this.state.mode === 'rotating') {
            // Use timezone-aware angle calculation
            const currentAngle = TimeUtils.getAngleAtLocation(this.state.currentTime, this.state.timezoneOffset);
            rotationOffset = -currentAngle;
        }

        this.layers.background.render(this.dimensions);
        this.layers.frame.render(this.dimensions);
        this.layers.clockFace.render(this.dimensions, this.state, rotationOffset);
    }
}
