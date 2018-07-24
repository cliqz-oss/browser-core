/* eslint no-param-reassign: 'off' */

import utils from '../core/utils';
import UrlParser from '../core/fast-url-parser';
import { getDetailsFromUrl } from '../core/url';

const parseURL = UrlParser.parse;

function getAlias(host, searchEngines) {
  const engine = searchEngines.find(({ urlDetails }) =>
    host === urlDetails.host || host === urlDetails.domain
  ) || {};

  return engine.alias;
}

const ALLOWED_SCHEMES = ['http', 'https', 'ftp'];

export default class SpeedDial {
  static getValidUrl(url) {
    let uri = parseURL(url);

    if (!uri || !uri.protocol) {
      url = url.replace(/^:?\/*/, '');
      url = `http://${url}`;
      uri = parseURL(url);
    }

    return (
      uri
      && ALLOWED_SCHEMES.indexOf(uri._protocol) !== -1
      && url
    ) || null;
  }

  static updateLogo(item) {
    const details = getDetailsFromUrl(item.url);
    const logoDetails = utils.getLogoDetails(details);

    item.logo = logoDetails;
    return item;
  }
  // dialSpecs = {url, title = '',isCustom = true}

  constructor({ url, title = '', isCustom = true }, searchEngines) {
    const details = getDetailsFromUrl(url);
    const logoDetails = utils.getLogoDetails(details);
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
    this.displayTitle = displayTitle || details.cleanHost || details.friendly_url || url;
    this.custom = isCustom;
    this.logo = logoDetails;
    this.searchAlias = getAlias(details.host, searchEngines);
  }
}
