import { utils } from 'core/cliqz';

export default class {
  constructor(url, isCustom = true) {
    var details = utils.getDetailsFromUrl(url);
    this.title = url;
    this.url = url;
    this.displayTitle = details.cleanHost || details.friendly_url || url;
    this.custom = isCustom;
    this.logo = utils.getLogoDetails(details);
  }
}


