import { window } from './globals';
export class Window {
  constructor(window) {
    this.window = window;
  }
}

export function mapWindows() {
  return [window];
}


export function isTabURL() {
  return false;
}

export function getLang() {
  return window.navigator.language || window.navigator.userLanguage;
}

export function getBrowserMajorVersion() {
  const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  return raw ? parseInt(raw[2], 10) : false;
}

export function setInstallDatePref() { }
export function setOurOwnPrefs() { }
export function getLang() {
  return window.navigator.language;
}
export function enableChangeEvents() {}

export function addWindowObserver() {}
export function removeWindowObserver() {}
export function forEachWindow(cb) {
  mapWindows().forEach(cb);
}
export function mustLoadWindow() {
  return true;
}

export function waitWindowReady(win) {
  return Promise.resolve();
}
