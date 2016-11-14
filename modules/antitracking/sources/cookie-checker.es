import { URLInfo } from 'antitracking/url';
import { getGeneralDomain } from 'antitracking/domain';
import { utils } from 'core/cliqz';


function currentGD() {
  const currwin = utils.getWindow();
  let gd = null;
  if (currwin && currwin.gBrowser) {
    const url = currwin.gBrowser.selectedBrowser.currentURI.spec;
    gd = getGeneralDomain(URLInfo.get(url).hostname);
  }
  return gd;
}

export default class {
  constructor() {
    this.contextFromEvent = null;
  }

  setContextFromEvent(ev, contextHTML) {
    try {
      if (contextHTML) {
        // don't log the event if it's not 3rd party
        const cGD = getGeneralDomain(URLInfo.get(ev.target.baseURI).hostname);
        const pageGD = currentGD();
        if (!pageGD || cGD === pageGD) {
          return;
        }
        this.contextFromEvent = {
          html: contextHTML,
          ts: Date.now(),
          cGD,
          pageGD,
        };
      }
    } catch (ee) {
      this.contextFromEvent = null;
    }
  }
}
