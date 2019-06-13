import { NativeModules } from 'react-native';
import window from './window';

const nativeWebRequest = NativeModules.WebRequest;
const LocaleConstants = NativeModules.LocaleConstants;
const defaultLocale = 'en';

export function currentURI() {}

export function contextFromEvent() {
  return null;
}

export function isWindowActive() {
  return true;
}

export function checkIsWindowActive(windowID) {
  return nativeWebRequest.isWindowActive(parseInt(windowID, 10));
}

export function forEachWindow(cb) {
  cb(window);
}

export function enableChangeEvents() {}

export function disableChangeEvents() {}

export function waitWindowReady() {
  return Promise.resolve();
}

export function mustLoadWindow() {
  return true;
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
  return LocaleConstants ? LocaleConstants.lang : defaultLocale;
}

export function getWindow() {}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}

export function getCookies() {
  return Promise.reject(new Error('Not implemented'));
}

export class Window {
  static _window = {};

  static findByTabId() {
    return this._window;
  }
}

export function isDefaultBrowser() {
  return null;
}

export function isPrivateMode() {
  return false;
}

export function openLink() {
}
