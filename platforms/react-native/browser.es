import { NativeModules } from 'react-native';
import language from './language/language';
import window from './window';

const nativeWebRequest = NativeModules.WebRequest;

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
  return language.lang;
}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}

export function getCookies() {
  return Promise.reject('Not implemented');
}

export class Window {
}
