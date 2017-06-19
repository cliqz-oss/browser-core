import BaseResult from './base';
import utils from '../../core/utils';
import { isUrl } from '../../core/url';

export default class NavigateToResult extends BaseResult {

  get template() {
    return 'navigate-to';
  }

  // it is not history but makes the background color to be light gray
  get isHistory() {
    return true;
  }

  get logo() {
    const query = this.rawResult.text;
    let url;
    if (isUrl(query)) {
      url = query;
    } else {
      url = `http://${query}`;
    }
    const urlDetails = utils.getDetailsFromUrl(url);
    return utils.getLogoDetails(urlDetails);
  }

  get kind() {
    return 'navigate-to';
  }

  get url() {
    const query = this.rawResult.text;
    return `moz-action:visiturl,${JSON.stringify({ url: query })}`;
  }

  get displayUrl() {
    return this.rawResult.text;
  }
}
