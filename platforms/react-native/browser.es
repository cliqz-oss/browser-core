import { NativeModules } from 'react-native';
import language from './language/language';
const nativeWebRequest = NativeModules.WebRequest;

export function currentURI() {};

export function contextFromEvent() {
  return null
}

export function isWindowActive(windowID) {
  return true;
}

export function checkIsWindowActive(windowID) {
  return nativeWebRequest.isWindowActive(parseInt(windowID));
}

export function forEachWindow(fn) {
}

export function setInstallDatePref() {
}

export function enableChangeEvents() {
}

export function disableChangeEvents() {
}

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

export function mapWindows(fn) {
  return [];
}

export function getLang() {
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
