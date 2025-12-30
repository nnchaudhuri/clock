/**
 * Sky Clock - Entry point
 */
import { SkyClock } from './SkyClock.js';

// Initialize the clock when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.skyClock = new SkyClock();
});
