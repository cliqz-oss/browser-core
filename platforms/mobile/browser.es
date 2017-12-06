import { window } from './globals';

export class Window {
  constructor(window) {
  }
}

export function mapWindows(cb) {
  return [cb(window)];
}

export function forEachWindow(cb) {
  cb(window);
};

export function setInstallDatePref() {
}

export function mustLoadWindow() {
  return true;
};

export function waitWindowReady() {
  return Promise.resolve();
}

export function setOurOwnPrefs() {
}

export function enableChangeEvents() {
};

export function addWindowObserver() {
};

export function removeWindowObserver() {
};

export function addSessionRestoreObserver() {
}

export function removeSessionRestoreObserver() {
}

export function getLang() {
  return window.navigator.language || window.navigator.userLanguage || 'en';
}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}
