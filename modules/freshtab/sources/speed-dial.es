import { utils } from 'core/cliqz';
import getEngines from "platform/search-engines";

function getAlias(aUrl) {
  const url = utils.getDetailsFromUrl(aUrl).host;
  const engine = getEngines().find(engine => {
    const urlDetails = utils.getDetailsFromUrl(engine.searchForm);
    return url === urlDetails.host || url === urlDetails.domain;
  }) || {};

  return engine.alias;
}

export default class {
  constructor(url, isCustom = true) {
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
    this.logo = utils.getLogoDetails(details);
    this.searchAlias = getAlias(url);
  }
}


