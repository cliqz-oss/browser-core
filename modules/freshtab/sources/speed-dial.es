import { utils } from '../core/cliqz';

function getAlias(host, searchEngines) {
  const engine = searchEngines.find(({ urlDetails }) => {
    return host === urlDetails.host || host === urlDetails.domain;
  }) || {};

  return engine.alias;
}

export default class SpeedDial {
  static getValidUrl(url) {
    const ALLOWED_SCHEMES = ['http', 'https', 'ftp'];
    let uri = utils.makeUri(url);

    if (!uri) {
      url = url.replace(/^:?\/*/,'');
      url = `http://${url}`;
      uri = utils.makeUri(url);
    }

    return uri &&
      ALLOWED_SCHEMES.indexOf(uri.scheme) !== -1 &&
      uri.spec ||
      null;
  }

  constructor(url, searchEngines, isCustom = true) {
    var details = utils.getDetailsFromUrl(url),
        logoDetails = utils.getLogoDetails(details);
    this.title = url;
    var protocolPos = url.indexOf('://'),
        id = url;
    // removes protocol http(s), ftp, ...
    if(protocolPos != -1 && protocolPos <= 6) {
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
