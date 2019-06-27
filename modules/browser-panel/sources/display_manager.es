import { forEachWindow } from '../platform/browser';
import { queryActiveTabs } from '../core/tabs';
import { setTimeout } from '../core/timers';
import inject from '../core/kord/inject';
import logger from './logger';

// /////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'bp-display-mngr';
const REAL_ESTATE_ID = 'browser-panel';


function lwarn(msg) {
  logger.log(`${MODULE_NAME} ${msg}`);
}
function lerr(msg) {
  logger.error(`${MODULE_NAME} ${msg}`);
}

export default class DisplayManager {
  constructor(uiConnectorCb) {
    // we will have 2 maps to control where to display what
    // elementID -> {urls: set(urls), data: eData}
    // url -> elementID
    this.elemToUrlsMap = {};
    this.urlToElemMap = {};
    this.browserPanel = inject.module('browser-panel');
    this.timersMap = {};
    this.uiConnectorCb = uiConnectorCb;
  }

  destroy() {
    Object.keys(this.timersMap).forEach(this._removeTimer.bind(this));
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                                API
  // ///////////////////////////////////////////////////////////////////////////

  /**
   * will add a element to be shown on the given url
   * @param  {[type]} eID   unique id to identify an element
   * @param  {[type]} eurl  exact url where we will display the element
   * @param  {[type]} eData data to be provided to the window for render the element.
   *                        if this is null we will not be updated
   * @return {[type]}       true on success | false otherwise
   */
  displayElement(eID, eUrl, eData) {
    if (!eID || !eUrl) {
      lwarn('displayElement: invalid args');
      return false;
    }

    // check if the url already exists, for now and simplicity we will skip
    // the event if already exists,
    if (this.urlToElemMap[eUrl]) {
      lwarn(`displayElement: we already have the url ${eUrl}, skipping this`);
      return false;
    }

    let elemCont = this.elemToUrlsMap[eID];
    if (!elemCont) {
      // we are displaying the element for the first time, we will emit an event
      // here notifying this.
      if (this.uiConnectorCb) {
        this.uiConnectorCb({
          handler: 'offers',
          data: {
            origin: REAL_ESTATE_ID,
            type: 'offer-action-signal',
            data: {
              action_id: 'offer_dsp_session',
              offer_id: eID,
            }
          }
        });
      }
      elemCont = { urls: new Set(), data: eData };
      this.elemToUrlsMap[eID] = elemCont;
    }
    elemCont.urls.add(eUrl);
    if (eData) {
      // update the edata
      elemCont.data = eData;
    }
    this.urlToElemMap[eUrl] = eID;

    // show the element in any of the current active tabs if any
    this._showOrHideElementOnActiveTabs();

    // check if we need to add a timer or not for this element
    if (eData.display_time_secs && !this._hasTimer(eID)) {
      this._addTimer(eID, eData.display_time_secs);
    }

    return true;
  }

  /**
   * remove the current element data and maps information
   * @param  {[type]} eID [description]
   * @return {[type]}     [description]
   */
  removeElement(eID, timedOut = false) {
    if (!eID) {
      return;
    }
    // we need to remove for all the urls the element
    const elemCont = this.elemToUrlsMap[eID];
    if (!elemCont) {
      return;
    }
    const self = this;
    elemCont.urls.forEach((u) => {
      delete self.urlToElemMap[u];
    });
    delete this.elemToUrlsMap[eID];

    // remove the timer if we have one
    if (this._hasTimer(eID)) {
      this._removeTimer(eID);
    }

    if (timedOut && this.uiConnectorCb) {
      this.uiConnectorCb({
        handler: 'offers',
        data: {
          origin: REAL_ESTATE_ID,
          type: 'offer-action-signal',
          data: {
            action_id: 'offer_timeout',
            offer_id: eID,
          }
        }
      });
    }

    // update the current tab if we have to
    this._showOrHideElementOnActiveTabs();
  }

  onTabOrUrlChange({ url }) {
    // TODO: we can improve here the code and check if the current change
    // requires a change in the current tabs, for simplicity we will check
    // always if the current active tabs should or should not show something
    try {
      this._showOrHideElementOnActiveTabs(url);
    } catch (e) {
      lerr(`onTabOrUrlChange: something bad happened here... ${e}`);
    }
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                          CALLBACKS / SIGNALS
  // ///////////////////////////////////////////////////////////////////////////


  // ///////////////////////////////////////////////////////////////////////////
  //                          PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  _showElement(win, eType, eData, url) {
    const blackList = ['resource://', 'about:', 'chrome://', 'file://'];
    if (url && blackList.some(e => url.startsWith(e))) {
      return;
    }

    if (!win || !eData) {
      lwarn('_showElement: the win object or eData is null');
      return;
    }

    // communicate with the window sending the offer data
    const args = {
      type: eType,
      data: eData
    };
    this.browserPanel.windowAction(win, 'showElement', args);
  }

  _hideElement(win, eType, eData) {
    if (!win) {
      lwarn('_hideElement: the win object is null');
      return;
    }

    // this will just hide the current offer on the given tab
    const args = {
      type: eType,
      data: eData
    };
    this.browserPanel.windowAction(win, 'hideElement', args);
  }

  _hasTimer(elemID) {
    return elemID && this.timersMap[elemID];
  }

  _addTimer(elemID, secs) {
    if (!elemID || !secs || secs <= 0) {
      return;
    }
    const currentTimer = this.timersMap[elemID];
    if (currentTimer) {
      this._removeTimer(elemID);
    }
    this.timersMap[elemID] = setTimeout(() => {
      this.removeElement(elemID, true); // this will remove the timer
    }, secs * 1000);
  }

  _removeTimer(elemID) {
    if (!elemID) {
      return;
    }
    const currentTimer = this.timersMap[elemID];
    if (currentTimer) {
      clearInterval(currentTimer);
      delete this.timersMap[elemID];
    }
  }

  //
  // @brief This method will check if a particular offer should be shown in any
  //        of the current active tabs of all windows
  //
  _showOrHideElementOnActiveTabs(url) {
    // get all tabs active tabs from the windows
    const activeTabsInfo = [];
    try {
      forEachWindow((win) => {
        const openTabs = queryActiveTabs(win);
        openTabs.forEach((data) => {
          if (data.isCurrent) {
            activeTabsInfo.push({ win, tab: data });
          }
        });
      });
    } catch (ee) {
      lerr(`_showOrHideElementOnActiveTabs: ${ee}`);
    }

    // show or hide on the given tabs
    const self = this;
    activeTabsInfo.forEach((tabInfo) => {
      const currentURL = tabInfo.tab.url;
      const elementID = self.urlToElemMap[currentURL];
      if (!elementID) {
        // nothing to show => hide

        // TODO: here offerElement shold be inserted maybe on the element data
        // instead of hardcoded here, whenever we have more types we should improve
        // this
        self._hideElement(tabInfo.win, 'offerElement', {});
        return;
      }
      // we show the element here
      const elemData = self.elemToUrlsMap[elementID];
      if (!elemData) {
        lerr('_showOrHideElementOnActiveTabs: we have a url but not an element? this is wrong');
        return;
      }
      // TODO: here offerElement shold be inserted maybe on the element data
      // instead of hardcoded here, whenever we have more types we should improve
      // this
      self._showElement(tabInfo.win, 'offerElement', elemData.data, url);
    });
  }
}
