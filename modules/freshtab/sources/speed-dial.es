/* eslint no-param-reassign: 'off' */

import utils from '../core/utils';
import { parseURL } from '../core/url-info';

function getAlias(host, searchEngines) {
  const engine = searchEngines.find(({ urlDetails }) =>
    host === urlDetails.host || host === urlDetails.domain
  ) || {};

  return engine.alias;
}

export default class SpeedDial {
  static getValidUrl(url) {
    const ALLOWED_SCHEMES = ['http', 'https', 'ftp'];
    let uri = parseURL(url);

    if (!uri) {
      url = url.replace(/^:?\/*/, '');
      url = `http://${url}`;
      uri = parseURL(url);
    }

    return (
      uri
      && ALLOWED_SCHEMES.indexOf(uri.protocol) !== -1
      && url
    ) || null;
  }

  constructor(url, searchEngines, isCustom = true) {
    const details = utils.getDetailsFromUrl(url);
    const logoDetails = utils.getLogoDetails(details);
    this.title = url;
    const protocolPos = url.indexOf('://');
    let id = url;
    // removes protocol http(s), ftp, ...
    if (protocolPos !== -1 && protocolPos <= 6) {
      id = url.split('://')[1];
    }
    this.id = id;
    this.url = url;
    this.displayTitle = details.cleanHost || details.friendly_url || url;
    this.custom = isCustom;
    this.logo = logoDetails;
    this.searchAlias = getAlias(details.host, searchEngines);
  }
}
