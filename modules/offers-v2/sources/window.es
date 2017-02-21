import background from './background';
import LoggingHandler from './logging_handler';
import OffersConfigs from './offers_configs';
import {utils} from '../core/cliqz';



////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'window';


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
export default class {
  constructor(settings) {
    // check if we have the feature  enabled
    if (!utils.getPref('offers2FeatureEnabled', false)) {
      return;
    }
    this.window = settings.window;
    this.settings = settings.settings;
    // GR-117 -> check comment below in init()
    this.tabsProgressListener = null;

    // integration of the new ui system here
    this.actions = {
      showOfferCoreHandler: this.showOfferCoreHandler.bind(this),
      hideOfferCoreHandler: this.hideOfferCoreHandler.bind(this),
    }

    // actions we will execute coming from the iframe
    this.iframeActions = {
      button_pressed: this.iframeButtonPressedAction.bind(this),
      get_last_data: this.getLastDataToShow.bind(this)
    }

    this.onIframeMessage = this.onIframeMessage.bind(this);
    this.lastDataToShow = null;
  }

  init() {
    // check if we have the feature  enabled
    if (!utils.getPref('offers2FeatureEnabled', false)) {
      return;
    }
    // EX-2561: private mode then we don't do anything here
    if (utils.isPrivate(this.window)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'we are in private mode, avoid any logic here');
      return;
    }
  }

  unload() {
    if (this.iframe) {
      this.iframe.parentElement.removeChild(this.iframe);
      delete this.iframe;
    }
  }

   //////////////////////////////////////////////////////////////////////////////
  //                              new ui system
  //////////////////////////////////////////////////////////////////////////////
  //

  hideIframe() {
    if (!this.iframe) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.warning(MODULE_NAME, 'hideIframe:  no iframe found?');
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
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.warning(MODULE_NAME, 'showIframe: no iframe found?');
      return;
    }
    this.iframe.style.height = OffersConfigs.UI_IFRAME_HEIGHT_DEF;
    this.iframe.style.width = OffersConfigs.UI_IFRAME_WIDTH_DEF;
  }

  setOfferID(offerID) {
    if (!this.iframe) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.warning(MODULE_NAME, 'getCurrentOfferID: no iframe found?');
      return null;
    }
    this.rootDocElem = this.iframe.contentDocument || this.iframe.contentWindow.document;
    this.rootDocElem = this.rootDocElem.getElementById('cliqz-offers');

    if (!this.rootDocElem) {
      return;
    }
    this.rootDocElem.cliqzofferid = offerID;
  }

  // return the current offer ID of the offer being displayed or null if not
  //
  getCurrentOfferID() {
    if (!this.iframe) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.warning(MODULE_NAME, 'getCurrentOfferID: no iframe found?');
      return null;
    }
    this.rootDocElem = this.iframe.contentDocument || this.iframe.contentWindow.document;
    this.rootDocElem = this.rootDocElem.getElementById('cliqz-offers');
    if (!this.rootDocElem) {
      return null;
    }
    return (this.rootDocElem.cliqzofferid === '') ? null : this.rootDocElem.cliqzofferid;
  }


  //
  // @brief Inject the notification iframe wherever we should put it
  //
  injectNotificationFrameIfNeeded(doc){
    // check if we have it already
    if (this.iframe) {
      // nothing to do
      return;
    }

    // we inject the message container at browser window level
    const panel = doc.getElementById("browser-panel"),
          contentDeck = doc.getElementById("content-deck"),
          iframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");

    // remove iframe from previous version
    try {
      const oldIframe = doc.getElementById('cqz-of-iframe', panel);
      if(oldIframe){
        oldIframe.parentElement.removeChild(oldIframe);
      }
    } catch(e) { /* bummer */ }

    // set the cliqz offers iframe
    // TODO: avoid some hardcoded values here
    iframe.id = OffersConfigs.UI_IFRAME_ELEM_ID;
    iframe.style.height = OffersConfigs.UI_IFRAME_HEIGHT_DEF;
    iframe.style.width = OffersConfigs.UI_IFRAME_WIDTH_DEF;
    iframe.style.overflow = "visible";
    iframe.style.position = "relative";
    iframe.style.minHeight = "0";
    iframe.style.zIndex = "99999";
    iframe.style.background = "#fff";
    iframe.src = OffersConfigs.UI_IFRAME_SRC_DEF;
    panel.insertBefore(iframe, contentDeck);

    iframe.contentWindow.addEventListener('message', this.onIframeMessage);
    this.iframe = iframe;

    this.setOfferID('');

    // we start with the frame hidden
    this.hideIframe();
  }


  //////////////////////////////////////////////////////////////////////////////
  //                           COMMUNICATION
  //////////////////////////////////////////////////////////////////////////////

  // pushes data to iframe
  sendTemplateDataToIframe(templateName, templateData) {
    this.sendMessageToPopup({
      action: 'render_template',
      data: {
        template_name: templateName,
        template_data: templateData
      }
    })
  }

  //
  // @brief generic method to wrap the message into the protocol
  //
  sendMessageToPopup(message) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cliqz-offers',
      origin: 'window',
      message: message
    }), '*');
  }

  //
  // @brief Parse an event from the iframe and execute the specific action
  //
  onIframeMessage(event) {
    const evtData = JSON.parse(event.data);
    if (evtData.target !== 'cliqz-offers' || evtData.origin !== 'iframe') {
      return;
    }
    const data = evtData.message;

    if (!data || !this.iframeActions[data.action]) {
      // nothing to do
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.warning(MODULE_NAME, 'onIframeMessage: invalid data?: ' + JSON.stringify(evtData));
      return;
    }

    // now process the action with the given arguments
    this.iframeActions[data.action](data.data);
  }


  //
  // @brief method to send a message to the core ui manager
  //
  sendToCoreUIHandler(data) {
    utils.callAction('offers-v2', 'windowUIConnector', [data]);
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                ACTIONS
  //////////////////////////////////////////////////////////////////////////////

  // Actions coming from the core

  showOfferCoreHandler() {
    var args = [].slice.call(arguments);
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'showOfferCoreHandler called with args: ' + JSON.stringify(args));
    if (args.length === 0) {
      return;
    }

    var offerData = args[0];
    if (!offerData.template_name || !offerData.template_data) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.warning(MODULE_NAME,
                             'showOfferCoreHandler: Some of the fields are missing ' +
                             ' to render the offer');
      return;
    }

    this.injectNotificationFrameIfNeeded(this.window.document);

    // store it for later usage
    this.lastDataToShow = offerData;

    const offerID = offerData.template_data.offer_id;
    const currentOfferID = this.getCurrentOfferID();

    // check if we want to update and/or trigger a signal
    if (currentOfferID === offerID) {
      // is the same, do nothing?
      return;
    }
    if (currentOfferID) {
      // it is a different offer than the current one
      this.sendToCoreUIHandler({
        signal_type: 'offer_hide',
        offer_id: currentOfferID,
      });
    }

    // set the current offer id
    this.setOfferID(offerID);

    this.sendTemplateDataToIframe(offerData.template_name, offerData.template_data);
    this.showIframe();


    // TODO: if we could show properly and was not shown before, we need to notify
    // here that the offer was shown with the given id
    this.sendToCoreUIHandler({
      signal_type: 'offer_shown',
      offer_id: offerID,
    });
  }

  hideOfferCoreHandler() {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'hideOfferCoreHandler called');

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
      signal_type: 'offer_hide',
      offer_id: offerID,
    });
  }


  // Actions coming from the iframe

  iframeButtonPressedAction(data) {
    // TODO:
    this.sendToCoreUIHandler(data)
  }

  getLastDataToShow(data) {
    if (this.lastDataToShow) {
      // # GR-293
      this.injectNotificationFrameIfNeeded(this.window.document);
      // #EX-3655 check if the id is properly set
      const offerIDToSet = this.lastDataToShow.template_data.offer_id;
      this.setOfferID(offerIDToSet);
      this.sendTemplateDataToIframe(this.lastDataToShow.template_name,
                                    this.lastDataToShow.template_data);
    }
  }

}
