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
        // Default color palette (artistic impressionistic style)
        // 0: Sun, 1: Moon, 2-11: Sky colors
        this.defaultColors = [
            '#f5e8d8', '#e8e4dc', '#1a1a2e', '#2d4059', '#a66d8f', '#d4a5a5',
            '#f0c5a0', '#e8dcc4', '#c5d8d8', '#a8c5c5', '#8fa5a5', '#7a9999'
        ];

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

        // Timelapse state
        this.timelapse = {
            enabled: false,
            speed: 1,  // hours per second
            simulatedTime: new Date(),
            lastFrameTime: null,
            lastDateStr: null  // Track date changes for sun data refresh
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
        // Info toggle
        document.getElementById('infoToggle').addEventListener('click', () => {
            const infoPanel = document.getElementById('infoPanel');
            const menuPanel = document.getElementById('menuPanel');
            const menuToggle = document.getElementById('menuToggle');
            
            infoPanel.classList.toggle('open');
            
            // Close menu if open
            if (infoPanel.classList.contains('open')) {
                menuPanel.classList.remove('open');
                menuToggle.classList.remove('open');
            }
        });

        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            const menuPanel = document.getElementById('menuPanel');
            const menuToggle = document.getElementById('menuToggle');
            const infoPanel = document.getElementById('infoPanel');
            
            menuPanel.classList.toggle('open');
            menuToggle.classList.toggle('open');
            
            // Close info if open
            if (menuPanel.classList.contains('open')) {
                infoPanel.classList.remove('open');
            }
        });

        // Close menu/info when clicking outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('menuPanel');
            const menuToggle = document.getElementById('menuToggle');
            const infoPanel = document.getElementById('infoPanel');
            const infoToggle = document.getElementById('infoToggle');
            
            if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
                menu.classList.remove('open');
                menuToggle.classList.remove('open');
            }
            
            if (!infoPanel.contains(e.target) && !infoToggle.contains(e.target)) {
                infoPanel.classList.remove('open');
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

        // Timelapse controls
        document.getElementById('timelapseToggle').addEventListener('click', () => this.toggleTimelapse());
        document.getElementById('timelapseSpeed').addEventListener('input', (e) => {
            this.timelapse.speed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = this.timelapse.speed;
        });

        // Color customization
        this.setupColorControls();
    }

    setupColorControls() {
        // Load saved colors from localStorage
        this.loadSavedColors();

        // Color picker change handlers
        document.querySelectorAll('.color-picker').forEach(picker => {
            picker.addEventListener('input', () => this.handleColorChange());
        });

        // Reset colors button
        document.getElementById('resetColors').addEventListener('click', () => this.resetColors());
    }

    loadSavedColors() {
        const savedColors = localStorage.getItem('skyClockColors');
        if (savedColors) {
            try {
                const colors = JSON.parse(savedColors);
                if (Array.isArray(colors) && colors.length === 12) {
                    this.applyColors(colors);
                    this.updateColorPickers(colors);
                }
            } catch (e) {
                console.log('Could not load saved colors:', e);
            }
        }
    }

    handleColorChange() {
        // Get current colors from pickers
        const colors = this.getColorsFromPickers();
        
        // Apply to clock and save
        this.applyColors(colors);
        this.saveColors(colors);
    }

    getColorsFromPickers() {
        const colors = [];
        document.querySelectorAll('.color-picker').forEach(picker => {
            const index = parseInt(picker.dataset.index);
            colors[index] = picker.value;
        });
        return colors;
    }

    updateColorPickers(colors) {
        document.querySelectorAll('.color-picker').forEach(picker => {
            const index = parseInt(picker.dataset.index);
            if (colors[index]) {
                picker.value = colors[index];
            }
        });
    }

    applyColors(colors) {
        this.layers.clockFace.setCustomColors(colors);
    }

    saveColors(colors) {
        localStorage.setItem('skyClockColors', JSON.stringify(colors));
    }

    resetColors() {
        this.updateColorPickers(this.defaultColors);
        this.applyColors(this.defaultColors);
        localStorage.removeItem('skyClockColors');
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

    fetchSunData() {
        if (!this.state.location) return;

        try {
            // Ensure we have a valid date
            const date = this.state.date || new Date();
            
            const sunData = SunService.getSunData(
                this.state.location.lat,
                this.state.location.lng,
                date
            );

            this.state.sunData = sunData;
            this.updateInfoPanel();
        } catch (error) {
            console.error('Error calculating sun data:', error);
            alert('Unable to calculate sun data. Please check your location coordinates.');
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

    startAnimation() {
        const animate = (timestamp) => {
            if (this.timelapse.enabled) {
                // Calculate delta time
                if (this.timelapse.lastFrameTime !== null) {
                    const deltaSeconds = (timestamp - this.timelapse.lastFrameTime) / 1000;
                    const hoursToAdd = deltaSeconds * this.timelapse.speed;
                    
                    // Advance simulated time
                    this.timelapse.simulatedTime = new Date(
                        this.timelapse.simulatedTime.getTime() + hoursToAdd * 3600000
                    );
                    
                    // Update state
                    this.state.currentTime = this.timelapse.simulatedTime;
                    this.state.date = new Date(this.timelapse.simulatedTime);
                    
                    // Check if date changed - refresh sun data
                    const newDateStr = this.state.date.toISOString().split('T')[0];
                    if (newDateStr !== this.timelapse.lastDateStr) {
                        this.timelapse.lastDateStr = newDateStr;
                        document.getElementById('dateInput').value = newDateStr;
                        this.fetchSunData();
                    }
                }
                this.timelapse.lastFrameTime = timestamp;
            } else {
                // Normal mode - use real time
                this.state.currentTime = new Date();
            }
            
            this.updateCurrentTimeDisplay();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    toggleTimelapse() {
        this.timelapse.enabled = !this.timelapse.enabled;
        
        const btn = document.getElementById('timelapseToggle');
        if (this.timelapse.enabled) {
            // Starting timelapse - initialize from current state
            this.timelapse.simulatedTime = new Date(this.state.date);
            this.timelapse.simulatedTime.setHours(
                this.state.currentTime.getHours(),
                this.state.currentTime.getMinutes(),
                this.state.currentTime.getSeconds()
            );
            this.timelapse.lastFrameTime = null;
            this.timelapse.lastDateStr = this.state.date.toISOString().split('T')[0];
            btn.textContent = '⏸';
        } else {
            // Stopping timelapse - reset to today's date and current time
            this.state.date = new Date();
            this.state.currentTime = new Date();
            document.getElementById('dateInput').value = this.state.date.toISOString().split('T')[0];
            this.fetchSunData();  // Refresh sun data for today
            btn.textContent = '▶';
        }
    }

    updateCurrentTimeDisplay() {
        // Display the time at the location using timezone offset
        if (this.timelapse.enabled) {
            // Show simulated time
            const simTime = this.timelapse.simulatedTime;
            const utcHours = simTime.getUTCHours();
            const utcMinutes = simTime.getUTCMinutes();
            const utcSeconds = simTime.getUTCSeconds();
            
            let localHours = utcHours + this.state.timezoneOffset;
            while (localHours < 0) localHours += 24;
            while (localHours >= 24) localHours -= 24;
            
            const hours = Math.floor(localHours).toString().padStart(2, '0');
            const minutes = utcMinutes.toString().padStart(2, '0');
            const seconds = utcSeconds.toString().padStart(2, '0');
            document.getElementById('currentTimeDisplay').textContent = `${hours}:${minutes}:${seconds}`;
        } else {
            document.getElementById('currentTimeDisplay').textContent = 
                TimeUtils.formatCurrentTimeAtLocation(this.state.timezoneOffset);
        }
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
