import { getPref, setPref } from './prefs';
import config from '../core/config';
import { chrome } from './globals';

const DEFAULT_DIST_VAL = 'web0003';

export function getUserAgent() {
  return navigator.userAgent;
}

export async function getDistribution() {
  let distribution = getPref('distribution', '');
  if (chrome.demographics && !distribution
    && config.settings.channel === '40'
    && navigator.userAgent.indexOf('Mac OS') > -1) {
    distribution = await chrome.demographics.getMacDistribution() || DEFAULT_DIST_VAL;
    setPref('distribution', distribution);
  }
  return distribution;
}

export function getChannel() {
  if (chrome.cliqzAppConstants) { // Android
    return chrome.cliqzAppConstants.get('CLIQZ_CHANNEL') || config.settings.channel || '';
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
