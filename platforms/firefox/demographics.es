import { getPref } from './prefs';
import getWindow from './window-api';
import config from '../core/config';

export async function getUserAgent() {
  return (await getWindow()).navigator.userAgent;
}

export function getDistribution() {
  return getPref('full_distribution') || getPref('distribution', '');
}

export function getInstallDate() {
  return getPref('install_date', '');
}

export function getChannel() {
  return config.settings.channel;
}

export function getCountry() {
  return getPref('config_location.granular', '');
}
