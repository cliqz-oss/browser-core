import window from './globals-window';

// For ghostery compatibility
export default window !== undefined ? (window.browser || window.chrome || {}) : {};
