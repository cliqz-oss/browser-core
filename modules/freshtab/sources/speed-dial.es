import { utils } from 'core/cliqz';

function getAlias(aUrl) {
  const url = utils.getDetailsFromUrl(aUrl).host;
  //EX-3916: blacklist google images and google maps on Freshtab speed-dials,
  // so that Google search takes precedence
  const blackListedEngines = utils.blackListedEngines('freshtab');
  const engine = utils.getSearchEngines(blackListedEngines).find(engine => {
    const urlDetails = utils.getDetailsFromUrl(engine.base_url);
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


