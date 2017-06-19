import ToolbarButtonManager from 'control-center/ToolbarButtonManager';
import inject from '../core/kord/inject';
import { utils, events } from '../core/cliqz';
import { addStylesheet } from '../core/helpers/stylesheet';
import Panel from '../core/ui/panel';
import console from '../core/console';
import background from './background';


function toPx(pixels) {
  return `${pixels.toString()}px`;
}

const BTN_ID = 'cliqz-offers-cc-btn';
const PANEL_ID = `${BTN_ID}-panel`;
const firstRunPref = 'cliqz-offers-cc-initialized';
const BTN_LABEL = '';
const TOOLTIP_LABEL = 'CLIQZ';
const OSE_NEW_OFFER = 'new-offer-added';

export default class {
  constructor(settings) {
    if (!background.is_enabled) {
      return;
    }

    this.window = settings.window;
    this.settings = settings.settings;
    this.channel = settings.settings.channel;
    this.cssUrl = 'chrome://cliqz/content/offers-cc/styles/xul.css';
    this.offersV2 = inject.module('offers-v2');

    this.actions = {
      getData: this.getData.bind(this),
      getEmptyFrameAndData: this.getEmptyFrameAndData.bind(this),
      resize: this.resizePopup.bind(this),
      sendTelemetry: this.sendTelemetry.bind(this),
      closePanel: this.closePanel.bind(this)
    };
    this.panel = new Panel(
      this.window,
      'chrome://cliqz/content/offers-cc/index.html',
      PANEL_ID,
      'offers-cc',
      false,
      this.actions,
      null,
      this.onPopupHiding.bind(this)
    );

    this.onStorageEvent = this.onStorageEvent.bind(this);
  }

  onPopupHiding() {
    // check if we need to update the state of all the offers as old
    if (this.panel.shownDurationTime <= 2000) {
      // nothing to do
      return null;
    }

    // else we will change the state of all offers
    const self = this;
    return this.offersV2.action('getStorageOffers').then((recentData) => {
      const offersIDs = [];
      recentData.forEach((elem) => {
        if (elem && elem.offer_info && elem.offer_info.offer_id) {
          offersIDs.push(elem.offer_info.offer_id);
          self.badge.setAttribute('state', '');
        }
      });

      // send the message with all the offers
      const eventData = {
        origin: 'offers-cc',
        offer_id: null,
        type: 'offers-state-changed',
        // no data for now
        data: {
          offers_ids: offersIDs,
          new_state: 'old'
        }
      };
      self.offersV2.action('onStorageOffersUIEvent', eventData);
    }).catch((e) => {
      utils.log(e.message, '!!error');
    });
  }

  init() {
    if (!background.is_enabled) {
      return;
    }

    this.panel.attach();
    // stylesheet for control center button
    addStylesheet(this.window.document, this.cssUrl);
    this.addCCbutton();
    events.sub('offers-storage:new_event', this.onStorageEvent);
  }

  unload() {
    if (!background.is_enabled) {
      return;
    }
    events.un_sub('offers-storage:new_event', this.onStorageEvent);
  }

  getData() {

  }

  // used for a first faster rendering
  getEmptyFrameAndData() {
    const self = this;
    this._getAllOffers().then((aData) => {
      self.sendMessageToPopup({
        action: 'pushData',
        data: aData
      });
    });
    // this.getData();
  }


  sendMessageToPopup(aMessage) {
    this.panel.sendMessage({
      target: 'cliqz-offers-cc',
      origin: 'window',
      message: aMessage
    });
  }


  addCCbutton() {
    const doc = this.window.document;
    const firstRunPrefVal = utils.getPref(firstRunPref, false);
    if (!firstRunPrefVal) {
      utils.setPref(firstRunPref, true);
      ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'bookmarks-menu-button');
    }

    const button = doc.createElement('toolbarbutton');
    button.setAttribute('id', BTN_ID);
    button.setAttribute('label', TOOLTIP_LABEL);
    button.setAttribute('tooltiptext', TOOLTIP_LABEL);
    button.classList.add('toolbarbutton-1');
    button.classList.add('chromeclass-toolbar-additional');
    this.button = button;

    const div = doc.createElement('div');
    div.setAttribute('class', 'cliqz-offers-cc');
    if (this.settings.controlCenterSecurity === true) {
      div.textContent = BTN_LABEL;
    }
    button.appendChild(div);

    button.addEventListener('command', () => {
      this.panel.open(button);
    });

    ToolbarButtonManager.restorePosition(doc, button);

    this.badge = div;
    this.button = button;
  }

  resizePopup({ width, height }) {
    this.panel.iframe.style.width = toPx(width);
    this.panel.iframe.style.height = toPx(height);
  }

  _getAllOffers() {
    const self = this;
    return this.offersV2.action('getStorageOffers').then((recentData) => {
      const parsedResult = [];
      recentData.forEach((elem) => {
        if (elem && elem.offer_info && elem.offer_info.offer_id && elem.offer_info.ui_info) {
          // we need to send the template name and template data here from the
          // ui info
          const uiInfo = elem.offer_info.ui_info;
          let offerState = elem.state;
          if (!offerState) {
            offerState = 'new';
          }
          const data = {
            created: elem.created_ts,
            state: offerState,
            template_name: uiInfo.template_name,
            template_data: uiInfo.template_data,
            offer_id: elem.offer_info.offer_id,
          };
          parsedResult.push(data);
        }
      });

      // Sort the results by the most recent one
      parsedResult.sort((a, b) => (b.created - a.created));

      self.allOffers = parsedResult;

      return Promise.resolve(parsedResult);
    });
  }


  sendTelemetry(data) {
    // utils.telemetry(data);
    // check the data
    if (!data.signal_type) {
      // error invalid data
      return;
    }

    // call the offers_storage module
    // {
    //   origin:    The id name to identify the ui (for example offers-storage-btn
    //              or any other id).
    //   offer_id:  The offer related on the ui event (or null if none).
    //   type:      The event type (button-clicked?)
    //   data:      Extra arguments if needed (like button id...).
    // }
    let eventData = null;
    if (data.signal_type === 'button_pressed') {
      // process the button pressed action, this actions have some impact or
      // modification on the offers module (for example closing an offer / etc).
      eventData = {
        origin: 'offers-cc',
        offer_id: data.offer_id,
         // TODO: note that we assume that we are always sending this way the data
        //       with the element_id, and it may not be always true
        type: data.element_id,
        // no data for now
        data: {},
      };
    } else if (data.signal_type === 'action') {
      // This type of signals are just for tracking and information purposes,
      // will not change any logic on the offers module
      // This signals are not related to any offer, just "telemetry"
      eventData = {
        origin: 'offers-cc',
        offer_id: null,
        type: 'action-signal',
        // no data for now
        data: {
          // this is the signal we want to send
          action_id: data.element_id
        },
      };
    } else if (data.signal_type === 'offer-action-signal') {
      // this signals will be associated to offers but will not affect the behavior
      // or anything on the offer module, just for information purposes.
      eventData = {
        origin: 'offers-cc',
        offer_id: data.offer_id,
        type: 'offer-action-signal',
        // no data for now
        data: {
          // this is the signal we want to send
          action_id: data.element_id
        },
      };
    }
    this.offersV2.action('onStorageOffersUIEvent', eventData);
  }

  //
  // subscribe to the storage events
  //
  onStorageEvent(event) {
    // we also have event data: event.data;
    const eventID = event.event_id;

    // TODO process the event here, for now we will get all the events again
    this._getAllOffers().then(() => {
      // data = JSON.stringify(data);

      if (eventID === OSE_NEW_OFFER) {
        // Auto open the panel
        this.openPanel();
        this.badge.setAttribute('state', 'new-offers');
      }
    }).catch((err) => {
      console.log('======= event: error: ', err);
    });
  }

  openPanel() {
    this.panel.open(this.button);
  }

  closePanel() {
    this.panel.hide();
  }

}
