import { NativeModules } from 'react-native';
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
  return
}

export function mapWindows(fn) {
  return [];
}

export function getLang() {
  return '';
}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}
