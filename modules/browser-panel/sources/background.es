import background from '../core/base/background';
import { utils, events } from '../core/cliqz';
import DisplayManager from './display_manager';

const MODULE_NAME = 'browser-panel-bg';


function linfo(msg) {
  utils.log(`[info] ${msg}`, MODULE_NAME);
}
function lwarn(msg) {
  utils.log(`[warning] ${msg}`, MODULE_NAME);
}
// function lerr(msg) {
//   utils.log(MODULE_NAME, `[error] ${msg}`);
// }

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {
    this.is_enabled = utils.getPref('offersBrowserPanelEnableSwitch', false);
    if (this.is_enabled) {
      this.displayMngr = new DisplayManager();
    }
    this.actions = {
      windowUIConnector: this.windowUIConnector.bind(this)
    };
  },

  unload() {
    if (!this.is_enabled) {
      return;
    }
    delete this.displayMngr;
  },

  beforeBrowserShutdown() {

  },

  /**
   * in this method we will process all the events coming from the ui
   * the layout of the message:
   * {
   *   handler: offers,
   *   data: {...}, // real data of the message
   * }
   * @return {[type]} [description]
   */
  displayCbHandler(msg) {
    if (!msg || !msg.handler) {
      lwarn('displayCbHandler: invalid msg format');
      return;
    }
    switch (msg.handler) {
      case 'offers':
        this.sendOffersMessage(msg.data);
        break;
      default:
        lwarn(`displayCbHandler: invalid handler: ${msg.handler}`);
        break;
    }
  },

  /**
   * this method will process the message coming from the offer module and
   * properly adapt it to the display manager. This method should be called from
   * the offers-send-ch callback or from the message-center
   * @param  {[type]} msg [description]
   * @return {[type]}     [description]
   */
  processOfferMessage(msg) {
    if (!msg.type || !msg.data) {
      lwarn(`processOfferMessage: invalid msg: ${msg}`);
      return;
    }
    // we will execute the proper action
    switch (msg.type) {
      case 'offer-active':
      case 'display-offer': {
        // check that the format is the proper
        if (!msg.data.offer_id || !msg.data.offer_data) {
          lwarn('processOfferMessage: missing arguments');
          return;
        }
        const offerID = msg.data.offer_id;
        const offerData = msg.data.offer_data;
        let displayUrls = null;
        if (msg.data.display_rule) {
          displayUrls = msg.data.display_rule.url;
        } else {
          displayUrls = msg.data.offer_data.rule_info.url;
        }
        if (!displayUrls) {
          lwarn('processOfferMessage: missing arguments on the msg?');
          return;
        }
        // we add the offer for all the urls
        const self = this;
        const offerInfo = {
          offer_id: offerID,
          offer_data: offerData
        };
        displayUrls.forEach((url) => {
          self.displayMngr.displayElement(offerID, url, offerInfo);
        });
      }
        break;
      case 'close-offer':
      case 'remove-offer':
        linfo(`processOfferMessage: removing offer: ${msg.data.offer_id}`);
        this.displayMngr.removeElement(msg.data.offer_id);
        break;
      default:
        linfo(`processOfferMessage: skipping msg type: ${msg.type}`);
        break;
    }
  },

  /**
   * we will send the offer signals on this method
   * @param  {[type]} msg [description]
   * @return {[type]}     [description]
   */
  sendOffersMessage(msg) {
    events.pub('offers-recv-ch', msg);
  },

  windowUIConnector(msg) {
    this.displayCbHandler(msg);
  },

  events: {
    'content:location-change': function onLocationChange({ url }) {
      // linfo(`content:location-change: ${JSON.stringify(url)}`);
      if (this.displayMngr) {
        this.displayMngr.onTabOrUrlChange({ url });
      }
    },
    'core:tab_select': function onTabSelected({ url }) {
      // linfo(`core:tab_select: ${JSON.stringify(url)}`);
      if (this.displayMngr) {
        this.displayMngr.onTabOrUrlChange({ url });
      }
    },

    // TODO: here we should later use the proper listener to get the events
    // from the message-center, we will do this in a second step after
    // we add the proper functionality on other commit
    'offers-send-ch': function onOfferMessage(msg) {
      if (!this.displayMngr) {
        // skip this message since it is not enabled
        return;
      }
      if (!msg || (msg.dest && msg.dest.length && !('browser-panel' in msg.dest))) {
        linfo('offers-send-ch: skipping event, not for us or wrong format?');
        return;
      }
      // else we have the proper format we process it
      this.processOfferMessage(msg);
    }
  },

  actions: {
  },
});
