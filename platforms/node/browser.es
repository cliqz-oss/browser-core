export function currentURI() {}

export function contextFromEvent() {
  return null;
}

export function isWindowActive() {
  return true;
}

export function checkIsWindowActive() {
  return Promise.resolve(true);
}

export function forEachWindow() {
}

export function enableChangeEvents() {}

export function disableChangeEvents() {}

export function waitWindowReady() {
}

export function setOurOwnPrefs() {
}

export function addWindowObserver() {
}

export function removeWindowObserver() {
}

export function addSessionRestoreObserver() {
}

export function removeSessionRestoreObserver() {
}

export function addMigrationObserver() {
}

export function removeMigrationObserver() {
}

export function mapWindows() {
  return [];
}

export function getLocale() {
  return 'en';
}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}

export function getCookies() {
  return Promise.reject();
}

export function isDefaultBrowser() {
  return Promise.resolve(null);
}

export function isPrivateMode() {
  return false;
}
