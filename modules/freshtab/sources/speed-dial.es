/* eslint no-param-reassign: 'off' */

import logos from '../core/services/logos';
import { URLInfo } from '../core/url-info';

function getAlias(host, searchEngines) {
  const engine = searchEngines.find(
    ({ urlDetails }) =>
      host === urlDetails.host || host === urlDetails.domain
  ) || {};

  return engine.alias;
}

const ALLOWED_SCHEMES = ['http:', 'https:', 'ftp:', 'resource:'];

export default class SpeedDial {
  static getValidUrl(url) {
    let uri = URLInfo.get(url);
    if (!uri || !uri.protocol) {
      url = url.replace(/^:?\/*/, '');
      url = `http://${url}`;
      uri = URLInfo.get(url);
    }

    return (
      uri
      && ALLOWED_SCHEMES.indexOf(uri.protocol) !== -1
      && url
    ) || null;
  }

  static updateLogo(item) {
    const logoDetails = logos.getLogoDetails(item.url);

    item.logo = logoDetails;
    return item;
  }

  constructor({ url, title = '', isCustom = true }, searchEngines) {
    const details = URLInfo.get(url);
    const logoDetails = logos.getLogoDetails(url);
    this.title = url;
    const displayTitle = title;
    const protocolPos = url.indexOf('://');
    let id = url;
    // removes protocol http(s), ftp, ...
    if (protocolPos !== -1 && protocolPos <= 6) {
      id = url.split('://')[1];
    }
    this.id = id;
    this.url = url;
    this.displayTitle = displayTitle || details.cleanHost || url;
    this.custom = isCustom;
    this.logo = logoDetails;
    this.searchAlias = getAlias(details.hostname, searchEngines);
  }
}
