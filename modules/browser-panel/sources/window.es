import { isPrivateMode, openLink } from '../core/browser';
import logos from '../core/services/logos';
import telemetry from '../core/services/telemetry';
import console from '../core/console';
import config from '../core/config';
import { REAL_ESTATE_ID } from './consts';
import { copyToClipboard } from '../core/clipboard';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import prefs from '../core/prefs';
import events from '../core/events';

const MODULE_NAME = 'browser-panel-window';
const UI_IFRAME_WIDTH_DEF = '100%';
const UI_IFRAME_HEIGHT_DEF = '107';
const UI_IFRAME_ELEM_ID = 'cqz-b-p-iframe';
const UI_IFRAME_SRC_DEF = `${config.baseURL}browser-panel/index.html`;

// We define the list of signals that are associated to the call to action function
// so we can send both
const callToActionSignalsSet = new Set([
  'offer_logo',
  'offer_picture',
  'offer_benefit',
  'offer_headline',
  'offer_title',
  'offer_description',
]);
const blueThemePref = 'freshtab.blueTheme.enabled';

function linfo(msg) {
  console.log(`[info] ${msg}`, MODULE_NAME);
}
function lwarn(msg) {
  console.log(`[warning] ${msg}`, MODULE_NAME);
}


export default class Win {
  constructor(settings) {
    this.window = settings.window;
    this.settings = settings.settings;
    this.background = settings.background;
    this.cssUrl = `${config.baseURL}browser-panel/styles/xul.css`;

    this.iframeHandlers = {
      offersIFrameHandler: this.offersIFrameHandler.bind(this),
      openUrlHandler: this.openURL.bind(this),
      copyToClipboard: ({ data }) => copyToClipboard(data),
      sendTelemetry: this.sendTelemetry.bind(this)
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
      get_last_data: this.getLastDataToShow.bind(this),
    };

    this.onIframeMessage = this.onIframeMessage.bind(this);
    this.lastDataToShow = null;
  }

  init() {
    addStylesheet(this.window.document, this.cssUrl);
    this.isPrivateMode = isPrivateMode(this.window);
    if (this.isPrivateMode) {
      linfo('we are in private mode, avoid any logic here');
      return Promise.resolve('Private mode active');
    }
    return this.injectNotificationFrameIfNeeded(this.window.document);
  }

  unload() {
    removeStylesheet(this.window.document, this.cssUrl);
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
      return;
    }
    this.iframe.style.height = `${UI_IFRAME_HEIGHT_DEF}px`;
    this.iframe.style.width = UI_IFRAME_WIDTH_DEF;

    const signal = {
      type: 'offrz',
      view: 'bar',
      action: 'show'
    };
    telemetry.push(signal);
  }

  //
  // @brief Inject the notification iframe wherever we should put it
  //
  injectNotificationFrameIfNeeded(doc) {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    // check if we have it already
    if (this.iframe) {
      // nothing to do
      return Promise.resolve();
    }
    // we inject the message container at browser window level
    const panel = doc.getElementById('browser-panel') || doc.getElementById('main-window');
    const contentDeck = doc.getElementById('content-deck');
    const iframe = doc.createElementNS('http://www.w3.org/1999/xhtml', 'iframe');
    iframe.tabIndex = -1;

    // remove iframe from previous version
    try {
      const oldIframe = doc.getElementById(UI_IFRAME_ELEM_ID, panel);
      if (oldIframe) {
        oldIframe.parentElement.removeChild(oldIframe);
      }
    } catch (e) { /* bummer */ }

    const updateTheme = (panelIframe) => {
      const isBlueThemeEnabled = prefs.get('freshtab.blueTheme.enabled', false);
      if (isBlueThemeEnabled) {
        panelIframe.classList.remove('cliqz-light');
        panelIframe.classList.add('cliqz-blue');
        panelIframe.contentDocument.getElementById('cqz-browser-panel-re').classList.add('blue');
      } else {
        panelIframe.classList.remove('cliqz-blue');
        panelIframe.contentDocument.getElementById('cqz-browser-panel-re').classList.remove('blue');
        panelIframe.classList.add('cliqz-light');
        panelIframe.contentDocument.getElementById('cqz-browser-panel-re').classList.add('light');
      }
    };

    function onIframeReady() {
      this.iframe = iframe;
      iframe.style.height = 0;
      iframe.style.width = UI_IFRAME_WIDTH_DEF;
      iframe.style.overflow = 'visible';
      iframe.style.position = 'relative';
      iframe.style.minHeight = '0';
      iframe.style.zIndex = '99999';
      iframe.contentWindow.addEventListener('message', this.onIframeMessage);
      resolver();
      updateTheme(iframe);
    }

    // set the cliqz offers iframe
    // TODO: avoid some hardcoded values here
    iframe.id = UI_IFRAME_ELEM_ID;
    iframe.src = UI_IFRAME_SRC_DEF;
    panel.insertBefore(iframe, contentDeck);

    iframe.addEventListener('load', onIframeReady.bind(this), true);
    this.iframe = iframe;
    this.onPrefChangeEvent = events.subscribe('prefchange', (pref) => {
      if (pref === blueThemePref) {
        updateTheme(iframe);
      }
    });

    // init all cases
    this.setOfferID('');

    // we start with the frame hidden
    this.hideIframe();
    return promise;
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
    this.background.actions.windowUIConnector(data);
  }

  /**
   * will show the proper element on the browser panel. The arguments should contain
   * the type of element to show
   * @param  {...[type]} args [description]
   * @return {[type]}         [description]
   */
  showElement(...args) {
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

    let titleColor;
    if (templateData.styles && templateData.styles.headline_color) {
      titleColor = templateData.styles.headline_color;
    } else {
      const url = templateData.call_to_action.url;
      const logoDetails = logos.getLogoDetails(url);
      titleColor = `#${logoDetails.brandTxtColor}`;
    }
    data.template_data.titleColor = titleColor;
    this.sendDataToIframe('render_template', data);
  }

  setOfferID(offerID) {
    if (!this.iframe) {
      return false;
    }
    this.rootDocElem = this.iframe.contentDocument || this.iframe.contentWindow.document;
    // this.rootDocElem = this.window.document || this.window.contentWindow.document;
    this.rootDocElem = this.rootDocElem.getElementById('cqz-browser-panel-re');

    if (!this.rootDocElem) {
      return false;
    }

    this.rootDocElem.setAttribute('data-cliqzofferid', offerID);
    return true;
  }

  // return the current offer ID of the offer being displayed or null if not
  //
  getCurrentOfferID() {
    if (!this.iframe) {
      return null;
    }
    this.rootDocElem = this.iframe.contentDocument || this.iframe.contentWindow.document;
    // this.rootDocElem = this.window.document || this.window.contentWindow.document;
    this.rootDocElem = this.rootDocElem.getElementById('cqz-browser-panel-re');

    if (!this.rootDocElem) {
      return null;
    }
    const attrValue = this.rootDocElem.getAttribute('data-cliqzofferid');
    return (attrValue === '') ? null : attrValue;
  }


  // Actions coming from the core

  showOfferElementHandler(aOfferData) {
    // if it is private do nothing
    if (this.isPrivateMode) {
      return;
    }

    if (!aOfferData.offer_id
        || !aOfferData.offer_data
        || !aOfferData.offer_data.ui_info
        || !aOfferData.offer_data.ui_info.template_name
        || !aOfferData.offer_data.ui_info.template_data) {
      lwarn('showOfferElementHandler: Some of the fields are missing to render the offer');
      return;
    }
    const offerData = aOfferData.offer_data;

    // store it for later usage
    this.lastDataToShow = aOfferData;

    const offerID = aOfferData.offer_id;
    const currentOfferID = this.getCurrentOfferID();

    // check if we want to update and/or trigger a signal
    if (currentOfferID === offerID) {
      // is the same, do nothing?
      return;
    }

    // set the current offer id
    this.setOfferID(offerID);
    this.sendOffersTemplateDataToIframe(
      offerData.ui_info.template_name,
      offerData.ui_info.template_data
    );
    this.showIframe();


    // TODO: if we could show properly and was not shown before, we need to notify
    // here that the offer was shown with the given id
    this.sendToCoreUIHandler({
      handler: 'offers',
      data: {
        origin: REAL_ESTATE_ID,
        type: 'offer-action-signal',
        data: {
          action_id: 'offer_shown',
          offer_id: offerID,
        }
      }
    });
  }

  hideOfferElementHandler() {
    if (this.isPrivateMode) {
      return;
    }

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
  }

  // Actions coming from the iframe

  iframeButtonPressedAction(data) {
    // we will build the proper data here depending on the signal we receive
    const msgs = [];
    switch (data.element_id) {
      case 'remove-offer':
        msgs.push({
          origin: REAL_ESTATE_ID,
          type: data.element_id,
          data: {
            // action_id: data.element_id,
            offer_id: data.offer_id,
          }
        });
        break;
      case 'more_about_cliqz':
        msgs.push({
          origin: REAL_ESTATE_ID,
          type: 'action-signal',
          data: {
            action_id: data.element_id,
          }
        });
        break;
      default:
        // we add the action id
        msgs.push({
          origin: REAL_ESTATE_ID,
          type: 'offer-action-signal',
          data: {
            action_id: data.element_id,
            offer_id: data.offer_id,
          }
        });
        // check the special case if it is a call to action
        if (callToActionSignalsSet.has(data.element_id)) {
          // it is we need to send this signal as well
          msgs.push({
            origin: REAL_ESTATE_ID,
            type: 'offer-action-signal',
            data: {
              action_id: 'offer_ca_action',
              offer_id: data.offer_id,
            }
          });
        }
        break;
    }

    msgs.forEach(msg => this.sendToCoreUIHandler({ handler: 'offers', data: msg }));
  }

  getLastDataToShow(/* data */) {
    if (this.lastDataToShow) {
      const offerData = this.lastDataToShow.offer_data;
      const offerIDToSet = this.lastDataToShow.offer_id;
      // # GR-293
      this.injectNotificationFrameIfNeeded(this.window.document);
      // #EX-3655 check if the id is properly set
      this.setOfferID(offerIDToSet);
      this.sendOffersTemplateDataToIframe(
        offerData.ui_info.template_name,
        offerData.ui_info.template_data
      );
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
    let target = data.data.element_id;
    switch (target) {
      case 'code_copied':
        target = 'copy_code';
        break;
      case 'offer_closed':
        target = 'remove';
        break;
      case 'more_about_cliqz':
        target = 'learn_more';
        break;
      default:
        return;
    }

    const signal = {
      type: 'offrz',
      view: 'bar',
      action: 'click',
      target,
    };
    telemetry.push(signal);
  }

  sendTelemetry(message) {
    const target = message.data.target;
    const action = message.data.action;
    console.log(action, target, '!!send Telemetry');
    const signal = {
      type: 'offrz',
      view: 'bar',
      action,
      target,
    };
    telemetry.push(signal);
  }

  openURL(data) {
    if (!data || !data.data) {
      return;
    }
    const tab = openLink(this.window, data.data.url, true);
    this.window.gBrowser.selectedTab = tab;

    // Send telemetry for all call to action elements
    const elId = data.data.el_id;
    if (elId) {
      if (elId === 'offer_description' || elId === 'offer_ca_action'
      || elId === 'offer_title' || elId === 'offer_logo') {
        const signal = {
          type: 'offrz',
          view: 'bar',
          action: 'click',
          target: 'use',
        };
        telemetry.push(signal);
      }
    }
  }
}
