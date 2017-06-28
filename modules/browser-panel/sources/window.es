import { utils } from '../core/cliqz';
import inject from '../core/kord/inject';
import background from './background';

const MODULE_NAME = 'browser-panel-window';
const ORIGIN_NAME = 'browser-panel';
const UI_IFRAME_WIDTH_DEF = '100%';
const UI_IFRAME_HEIGHT_DEF = '200px';
const UI_IFRAME_ELEM_ID = 'cqz-b-p-iframe';
const UI_IFRAME_SRC_DEF = 'chrome://cliqz/content/browser-panel/index.html';


function linfo(msg) {
  utils.log(`[info] ${msg}`, MODULE_NAME);
}
function lwarn(msg) {
  utils.log(`[warning] ${msg}`, MODULE_NAME);
}
// function lerr(msg) {
//   utils.log(MODULE_NAME, `[error] ${msg}`);
// }

export default class {
  constructor(settings) {
    // check if we have the feature  enabled
    if (!background.is_enabled) {
      return;
    }

    this.window = settings.window;
    this.settings = settings.settings;
    this.coreModule = inject.module('browser-panel');

    this.iframeHandlers = {
      offersIFrameHandler: this.offersIFrameHandler.bind(this)
    };

    // integration of the new ui system here
    this.showElementHandlers = {
      offerElement: this.showOfferElementHandler.bind(this),
    };
    this.hideElementHandlers = {
      offerElement: this.hideOfferElementHandler.bind(this)
    };

    this.actions = {
      showElement: this.showElement.bind(this),
      hideElement: this.hideElement.bind(this),
    };

    // actions we will execute coming from the iframe
    this.offersActions = {
      button_pressed: this.iframeButtonPressedAction.bind(this),
      get_last_data: this.getLastDataToShow.bind(this)
    };

    this.onIframeMessage = this.onIframeMessage.bind(this);
    this.lastDataToShow = null;
  }

  init() {
    if (!background.is_enabled) {
      return;
    }

    if (utils.isPrivate(this.window)) {
      linfo('we are in private mode, avoid any logic here');
    }
  }

  unload() {
    if (this.iframe) {
      this.iframe.parentElement.removeChild(this.iframe);
      delete this.iframe;
    }
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                              new ui system
  // ///////////////////////////////////////////////////////////////////////////
  //

  hideIframe() {
    if (!this.iframe) {
      lwarn('hideIframe:  no iframe found?');
      return;
    }
    this.iframe.style.width = '0';
    this.iframe.style.height = '0';
    this.iframe.style.border = 'none';

    // for safety we remove the id of the offer
    this.setOfferID('');
  }

  showIframe() {
    if (!this.iframe) {
      lwarn('showIframe: no iframe found?');
      return;
    }
    this.iframe.style.height = UI_IFRAME_HEIGHT_DEF;
    this.iframe.style.width = UI_IFRAME_WIDTH_DEF;
  }

  //
  // @brief Inject the notification iframe wherever we should put it
  //
  injectNotificationFrameIfNeeded(doc) {
    // check if we have it already
    if (this.iframe) {
      // nothing to do
      return;
    }

    // we inject the message container at browser window level
    const panel = doc.getElementById('browser-panel');
    const contentDeck = doc.getElementById('content-deck');
    const iframe = doc.createElementNS('http://www.w3.org/1999/xhtml', 'iframe');

    // remove iframe from previous version
    try {
      const oldIframe = doc.getElementById(UI_IFRAME_ELEM_ID, panel);
      if (oldIframe) {
        oldIframe.parentElement.removeChild(oldIframe);
      }
    } catch (e) { /* bummer */ }

    function onIframeReady() {
      iframe.style.height = UI_IFRAME_HEIGHT_DEF;
      iframe.style.width = UI_IFRAME_WIDTH_DEF;
      iframe.style.overflow = 'visible';
      iframe.style.position = 'relative';
      iframe.style.minHeight = '0';
      iframe.style.zIndex = '99999';
      iframe.style.background = '#fff';
      iframe.contentWindow.addEventListener('message', this.onIframeMessage);
    }
    // set the cliqz offers iframe
    // TODO: avoid some hardcoded values here
    iframe.id = UI_IFRAME_ELEM_ID;
    iframe.src = UI_IFRAME_SRC_DEF;
    panel.insertBefore(iframe, contentDeck);

    iframe.addEventListener('load', onIframeReady.bind(this), true);
    this.iframe = iframe;

    // init all cases
    this.setOfferID('');

    // we start with the frame hidden
    this.hideIframe();
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                           COMMUNICATION
  // ///////////////////////////////////////////////////////////////////////////

  sendDataToIframe(actionID, dataObj) {
    const message = { action: actionID, data: dataObj };
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cqz-browser-panel-re',
      origin: 'window',
      message,
    }), '*');
  }

  /**
   * method that will process the message coming from the iframe, it should contain
   * the following layout:
   * <pre>
   * {
   *   data: {
   *     target: 'cqz-browser-panel-re',
   *     origin: 'iframe',
   *     message: {
   *       handler: 'handler_id' (example: 'offersIFrameHandler')
   *       data: {
   *         // the real data for the handler here
   *       }
   *     }
   *   }
   * }
   * </pre>
   * @param  {[type]} event [description]
   * @return {[type]}       [description]
   */
  onIframeMessage(event) {
    const evtData = JSON.parse(event.data);
    if (evtData.target !== 'cqz-browser-panel-re' || evtData.origin !== 'iframe') {
      return;
    }
    const data = evtData.message;

    if (!data || !this.iframeHandlers[data.handler]) {
      // nothing to do
      lwarn(`onIframeMessage: invalid data?: ${JSON.stringify(evtData)}`);
      return;
    }

    // now process the action with the given arguments
    this.iframeHandlers[data.handler](data);
  }


  //
  // @brief method to send a message to the core ui manager
  //
  sendToCoreUIHandler(data) {
    this.coreModule.action('windowUIConnector', data);
  }

  /**
   * will show the proper element on the browser panel. The arguments should contain
   * the type of element to show
   * @param  {...[type]} args [description]
   * @return {[type]}         [description]
   */
  showElement(...args) {
    // linfo(`showElement called with args: ${JSON.stringify(args)}`);
    if (args.length === 0) {
      return;
    }

    const elementInfo = args[0];
    if (!elementInfo.type || !elementInfo.data) {
      lwarn('showElement: Some of the fields are missing to render the element');
      return;
    }

    // we call the proper render method
    const showHandler = this.showElementHandlers[elementInfo.type];
    if (!showHandler) {
      lwarn(`showElement: we dont have a handler for ${elementInfo.type}`);
      return;
    }
    showHandler(elementInfo.data);
  }

  hideElement(...args) {
    // linfo(`hideElement called with args: ${JSON.stringify(args)}`);
    if (args.length === 0) {
      return;
    }

    const elementInfo = args[0];
    if (!elementInfo.type) {
      lwarn('hideElement: Some of the fields are missing to render the element');
      return;
    }

    const hideHandler = this.hideElementHandlers[elementInfo.type];
    if (!hideHandler) {
      lwarn(`hideElement: we dont have a handler for ${elementInfo.type}`);
      return;
    }

    hideHandler(elementInfo.data);
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                                OFFERS
  // ///////////////////////////////////////////////////////////////////////////

  sendOffersTemplateDataToIframe(templateName, templateData) {
    const data = {
      template_name: templateName,
      template_data: templateData
    };
    this.sendDataToIframe('render_template', data);
  }

  setOfferID(offerID) {
    if (!this.iframe) {
      lwarn('setOfferID: no iframe found?');
      return false;
    }
    this.rootDocElem = this.iframe.contentDocument || this.iframe.contentWindow.document;
    // this.rootDocElem = this.window.document || this.window.contentWindow.document;
    this.rootDocElem = this.rootDocElem.getElementById('cqz-browser-panel-re');

    if (!this.rootDocElem) {
      lwarn('setOfferID: no rootDocElem found?');
      return false;
    }
    this.rootDocElem.setAttribute('cliqzofferid', offerID);
    return true;
  }

  // return the current offer ID of the offer being displayed or null if not
  //
  getCurrentOfferID() {
    if (!this.iframe) {
      lwarn('getCurrentOfferID: no iframe found?');
      return null;
    }
    this.rootDocElem = this.iframe.contentDocument || this.iframe.contentWindow.document;
    // this.rootDocElem = this.window.document || this.window.contentWindow.document;
    this.rootDocElem = this.rootDocElem.getElementById('cqz-browser-panel-re');

    if (!this.rootDocElem) {
      return null;
    }
    const attrValue = this.rootDocElem.getAttribute('cliqzofferid');
    return (attrValue === '') ? null : attrValue;
  }


  // Actions coming from the core

  showOfferElementHandler(aOfferData) {
    if (!aOfferData.offer_id ||
        !aOfferData.offer_data ||
        !aOfferData.offer_data.ui_info ||
        !aOfferData.offer_data.ui_info.template_name ||
        !aOfferData.offer_data.ui_info.template_data) {
      lwarn('showOfferElementHandler: Some of the fields are missing to render the offer');
      return;
    }
    const offerData = aOfferData.offer_data;
    this.injectNotificationFrameIfNeeded(this.window.document);

    // store it for later usage
    this.lastDataToShow = aOfferData;

    const offerID = aOfferData.offer_id;
    const currentOfferID = this.getCurrentOfferID();

    // check if we want to update and/or trigger a signal
    if (currentOfferID === offerID) {
      // is the same, do nothing?
      return;
    }
    if (currentOfferID) {
      // it is a different offer than the current one
      this.sendToCoreUIHandler({
        handler: 'offers',
        data: {
          origin: ORIGIN_NAME,
          type: 'offer-action-signal',
          data: {
            action_id: 'offer_hide',
            offer_id: currentOfferID,
          }
        }
      });
    }

    // set the current offer id
    this.setOfferID(offerID);

    this.sendOffersTemplateDataToIframe(offerData.ui_info.template_name,
                                        offerData.ui_info.template_data);
    this.showIframe();


    // TODO: if we could show properly and was not shown before, we need to notify
    // here that the offer was shown with the given id
    this.sendToCoreUIHandler({
      handler: 'offers',
      data: {
        origin: ORIGIN_NAME,
        type: 'offer-action-signal',
        data: {
          action_id: 'offer_shown',
          offer_id: offerID,
        }
      }
    });
  }

  hideOfferElementHandler() {
    linfo('hideOfferElementHandler called');

    // delete old data
    if (this.lastDataToShow) {
      delete this.lastDataToShow;
      this.lastDataToShow = null;
    }

    const offerID = this.getCurrentOfferID();

    if (!offerID) {
      // nothing to do
      this.hideIframe();
      return;
    }

    this.hideIframe();

    this.sendToCoreUIHandler({
      handler: 'offers',
      data: {
        origin: ORIGIN_NAME,
        type: 'offer-action-signal',
        data: {
          action_id: 'offer_hide',
          offer_id: offerID,
        }
      }
    });
  }


  // Actions coming from the iframe

  iframeButtonPressedAction(data) {
    // we will build the proper data here depending on the signal we receive
    const msgData = {
      origin: ORIGIN_NAME,
      type: 'offer-action-signal',
      data: {
        // action_id: data.element_id,
        offer_id: data.offer_id,
      }
    };
    // only for some cases we need to change the layout
    switch (data.element_id) {
      case 'call-to-action':
      case 'close-offer':
      case 'remove-offer':
        msgData.type = data.element_id;
        break;
      default:
        // we add the action id
        msgData.data.action_id = data.element_id;
        break;
    }
    this.sendToCoreUIHandler({
      handler: 'offers',
      data: msgData
    });
  }

  getLastDataToShow(/* data */) {
    if (this.lastDataToShow) {
      const offerData = this.lastDataToShow.offer_data;
      const offerIDToSet = this.lastDataToShow.offer_id;
      // # GR-293
      this.injectNotificationFrameIfNeeded(this.window.document);
      // #EX-3655 check if the id is properly set
      this.setOfferID(offerIDToSet);
      this.sendOffersTemplateDataToIframe(offerData.ui_info.template_name,
                                          offerData.ui_info.template_data);
    }
  }

  /**
   * this method will be called whenever we get a message from the UI and is related
   * to offers
   * @param  {[type]} data [description]
   * {
   *   action: 'action name',
   *   data: {...}
   * }
   * @return {[type]}     [description]
   */
  offersIFrameHandler(data) {
    if (!data || !this.offersActions[data.action]) {
      // nothing to do
      lwarn(`offersMsgHandler: invalid data?: ${JSON.stringify(data)}`);
      return;
    }

    // now process the action with the given arguments
    this.offersActions[data.action](data.data);
  }

}
