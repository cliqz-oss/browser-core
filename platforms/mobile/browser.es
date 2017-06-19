import { window } from './globals';

export class Window {
  constructor(window) {
  }
}

export function mapWindows() {
  return [];
}

export function getLang() {
  return window.navigator.language || window.navigator.userLanguage;
}

export function isTabURL() {
  return false;
}

export function getBrowserMajorVersion() {
  return 100;
}
