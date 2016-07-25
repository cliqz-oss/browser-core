import { URLInfo } from 'antitracking/url';
import { getGeneralDomain } from 'antitracking/domain';
import { utils } from "core/cliqz";

export default class {
  constructor() {
    this.contextFromEvent = null;
  }

  setContextFromEvent(ev, contextHTML) {
    try {
      if (contextHTML) {
        this.contextFromEvent = {
          html: contextHTML,
          ts: Date.now(),
          gDM: getGeneralDomain(URLInfo.get(ev.target.baseURI).hostname)
        };
      }
    } catch(ee) {
      this.contextFromEvent = null;
    }
  }
}
