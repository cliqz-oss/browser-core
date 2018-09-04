import { getPref } from './prefs';
import config from '../core/config';
import { chrome } from './globals';

export function getUserAgent() {
  return navigator.userAgent;
}

export function getDistribution() {
  return getPref('distribution', '');
}

export async function getChannel() {
  if (chrome.cliqzAppConstants) { // Android
    return chrome.cliqzAppConstants.get('CLIQZ_CHANNEL') || '';
  }
  return config.settings.channel || '';
}

export async function getInstallDate() {
  if (chrome.cliqzNativeBridge) { // Android
    return chrome.cliqzNativeBridge.callAction('getInstallDate', []);
  }
  return getPref('install_date', '');
}

export function getCountry() {
  return getPref('config_location.granular', '');
}
