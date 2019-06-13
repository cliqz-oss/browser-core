import { window } from './globals';

export class Window {

}

export function mapWindows(cb) {
  return [cb(window)];
}

export function forEachWindow(cb) {
  cb(window);
}

export function mustLoadWindow() {
  return true;
}

export function waitWindowReady() {
  return Promise.resolve();
}

export function setOurOwnPrefs() {
}

export function enableChangeEvents() {}

export function addWindowObserver() {
}

export function removeWindowObserver() {
}

export function addMigrationObserver() {
}

export function removeMigrationObserver() {
}

export function addSessionRestoreObserver() {
}

export function removeSessionRestoreObserver() {
}

export function getLocale() {
  return window.navigator.language || window.navigator.userLanguage || 'en';
}

export function getWindow() {
  return window;
}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}

export function getCookies() {

}

export function reportError() {}

export function disableChangeEvents() {}

export function resetOriginalPrefs() {}

export function isDefaultBrowser() {
  return Promise.resolve(null);
}

export function isPrivateMode() {
  return false;
}

/* eslint-disable no-param-reassign */
export function openLink(win, url) {
  if (url !== '#') {
    if (url.indexOf('http') === -1) {
      url = `http://${url}`;
    }
    win.location.href = url;
  }

  return false;
}
/* eslint-enable no-param-reassign */
