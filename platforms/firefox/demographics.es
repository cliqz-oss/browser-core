import { getPref } from './prefs';
import getWindow from './window-api';
import config from '../core/config';

export function getUserAgent() {
  return getWindow().then(win => win.navigator.userAgent);
}

export function getDistribution() {
  return Promise.resolve(getPref('distribution', ''));
}

export function getInstallDate() {
  return Promise.resolve(getPref('install_date', ''));
}

export function getChannel() {
  return Promise.resolve(config.settings.channel);
}
