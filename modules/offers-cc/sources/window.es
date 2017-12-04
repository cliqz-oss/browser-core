import inject from '../core/kord/inject';
import { utils, events } from '../core/cliqz';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import background from './background';
import UITour from '../platform/ui-tour';
import config from '../core/config';
import { isPlatformAtLeastInVersion } from '../core/platform';

let ORIGIN_NAME = 'offers-cc';
const UI_TOUR_ID = 'cliqz-offers';

const offersHubTrigger = utils.getPref('offersHubTrigger', 'off');
if (offersHubTrigger === 'tooltip') {
  ORIGIN_NAME = 'offers-cc-tooltip';
}

let seenOffersObj = {};
let autoTrigger = false;

export default class {
  constructor(settings) {
    if (!background.is_enabled) {
      return;
    }

    this.window = settings.window;
    this.settings = settings.settings;
    this.channel = settings.settings.channel;
    this.cssUrl = `${config.baseURL}offers-cc/styles/xul.css`;
    this.offersV2 = inject.module('offers-v2');

    this.actions = {
      getEmptyFrameAndData: this.getEmptyFrameAndData.bind(this),
      resize: this.resizePopup.bind(this),
      sendTelemetry: this.sendTelemetry.bind(this),
      closePanel: this.closePanel.bind(this),
      removeOffer: this.removeOffer.bind(this),
      openURL: this.openURL.bind(this),
      seenOffers: this.seenOffers.bind(this),
    };

    this.onOffersCoreEvent = this.onOffersCoreEvent.bind(this);
    this.onTooltipClicked = this.onTooltipClicked.bind(this);
    this.onEvent = this.onEvent.bind(this);

    this.toolbarButton = background.toolbarButton;
    this.toolbarButton.addWindow(this.window, this.actions, {
      onClick: this.onButtonClicked.bind(this),
      onViewShowing: this.onPopupShowing.bind(this),
      onViewHiding: this.onPopupHiding.bind(this),
    });

    this.toolbarButtonElement = this.window.document.getElementById(this.toolbarButton.id);
  }

  init() {
    if (!background.is_enabled) {
      return;
    }

    // stylesheet for offers-cc button
    addStylesheet(this.window.document, this.cssUrl);
    events.sub('offers-send-ch', this.onOffersCoreEvent);
    UITour.targets.set(UI_TOUR_ID, { query: `#${this.toolbarButton.id}`, widgetName: this.toolbarButton.id, allowAdd: true });
  }

  unload() {
    if (!background.is_enabled) {
      return;
    }
    events.un_sub('offers-send-ch', this.onOffersCoreEvent);
    UITour.targets.delete(UI_TOUR_ID);
    removeStylesheet(this.window.document, this.cssUrl);
    // Remove the tooltip listener if the tooltip has been closed unexpectedly
    // (when another tooltip shows)
    if (this.tooltipEventListenerAdded) {
      this.removeTooltipEventListener();
    }
  }

  addTooltipEventListener() {
    this.window.document.querySelector('#UITourTooltip')
                                    .addEventListener('click', this.onTooltipClicked);
    this.window.addEventListener('blur', this.onEvent);
    this.window.addEventListener('click', this.onEvent);
  }

  removeTooltipEventListener() {
    this.window.document.querySelector('#UITourTooltip')
                        .removeEventListener('click', this.onTooltipClicked);
    this.window.removeEventListener('blur', this.onEvent);
    this.window.removeEventListener('click', this.onEvent);
  }

  onEvent() {
    if (!background.hasUITourClicked) {
      return;
    }

    this.hideUITour();
  }

  onTooltipClicked(e) {
    // Check if user click on this offer tooltip or not
    const tooltipSelector = '#UITourTooltip[targetName=cliqz-offers]';
    const offerTooltip = this.window.document.querySelector(tooltipSelector);
    if (!offerTooltip || (offerTooltip && !offerTooltip.contains(e.target))) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const signal = {
      type: 'offrz',
      view: 'box_tooltip',
      action: 'click',
    };
    utils.telemetry(signal);

    if (e.target.matches('#UITourTooltipClose')) {
      return;
    }

    background.actions.closeUITour();
    this.hideUITour();

    const msg = {
      type: 'action-signal',
      data: {
        action_id: 'tooltip_clicked',
      },
    };
    this.sendMessageToOffersCore(msg);

    this.toolbarButtonElement.setAttribute('state', '');
    this.openPanel();
  }

  onButtonClicked() {
    if (this.isUITourOpening) {
      background.actions.closeUITour();
    }
    this.hideUITour();
    const signal = {
      type: 'offrz',
      view: 'box',
      action: 'click',
      target: 'icon',
    };
    utils.telemetry(signal);
  }

  onPopupShowing() {
    if (autoTrigger) {
      const msg = {
        type: 'action-signal',
        data: {
          action_id: 'hub_pop_up',
        },
      };
      this.sendMessageToOffersCore(msg);
    } else {
      const msg = {
        type: 'action-signal',
        data: {
          action_id: 'hub_open',
        },
      };
      this.sendMessageToOffersCore(msg);
    }

    this._getAllOffers().then((results) => {
      const signal = {
        type: 'offrz',
        view: 'box',
        action: 'show',
        offer_count: results.length,
      };
      utils.telemetry(signal);
    });
  }

  onPopupHiding() {
    if (this.toolbarButton.shownDurationTime <= 1000) {
      // nothing to do
      return null;
    }

    this.toolbarButtonElement.setAttribute('state', '');
    // else we will change the state of all offers

    Object.keys(seenOffersObj).forEach((offer) => {
      const msgSession = {
        type: 'offer-action-signal',
        data: {
          action_id: 'offer_dsp_session',
          offer_id: offer,
        },
      };
      this.sendMessageToOffersCore(msgSession);

      if (!autoTrigger) {
        const msgPulled = {
          type: 'offer-action-signal',
          data: {
            action_id: 'offer_pulled',
            offer_id: offer,
          },
        };
        this.sendMessageToOffersCore(msgPulled);
      }

      const msgShown = {
        type: 'offer-action-signal',
        data: {
          action_id: 'offer_shown',
          offer_id: offer,
          counter: seenOffersObj[offer]
        },
      };
      this.sendMessageToOffersCore(msgShown);
    });

    const msgState = {
      type: 'change-offer-state',
      // no data for now
      data: {
        offers_ids: Object.keys(seenOffersObj),
        new_state: 'old'
      }
    };
    this.sendMessageToOffersCore(msgState);

    const msg = {
      type: 'action-signal',
      data: {
        action_id: 'hub_closed',
      },
    };
    this.sendMessageToOffersCore(msg);

    seenOffersObj = {};
    autoTrigger = false;
    // ORIGIN_NAME = 'offers-cc';

    return null;
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
  }


  sendMessageToPopup(aMessage) {
    const msg = {
      target: 'cliqz-offers-cc',
      origin: 'window',
      message: aMessage
    };

    this.toolbarButton.sendMessage(this.window, msg);
  }

  resizePopup({ width, height }) {
    this.toolbarButton.resizePopup(this.window, { width, height });
  }

  _getAllOffers() {
    const self = this;
    const args = {
      filters: {
        by_rs_dest: ORIGIN_NAME
      }
    };
    return this.offersV2.action('getStoredOffers', args).then((recentData) => {
      const parsedResult = [];
      recentData.forEach((elem) => {
        if (elem &&
            elem.offer_id &&
            elem.offer_info &&
            elem.offer_info.ui_info) {
          // we need to send the template name and template data here from the
          // ui info
          const uiInfo = elem.offer_info.ui_info;

          let offerState = 'new';
          if (elem.attrs && elem.attrs.state) {
            offerState = elem.attrs.state;
          }
          const data = {
            created: elem.created_ts,
            state: offerState,
            template_name: uiInfo.template_name,
            template_data: uiInfo.template_data,
            offer_id: elem.offer_id,
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

  /**
   * will send a message to the offers-core following the new API:
   * https://cliqztix.atlassian.net/wiki/pages/viewpage.action?pageId=88618158
   * @param  {[type]} msg  object containing the following parameters:
   *                       - type (signal type)
   *                       - data (depending on the type)
   * @return {[type]}      [description]
   */
  sendMessageToOffersCore(msg) {
    if (!msg || !msg.type) {
      utils.log('Error: invalid message');
      return;
    }
    // create the message to be sent
    const message = {
      origin: ORIGIN_NAME,
      type: msg.type,
      data: msg.data
    };
    events.pub('offers-recv-ch', message);
  }

  sendTelemetry(data) {
    // utils.telemetry(data);
    // check the data
    if (!data.signal_type) {
      // error invalid data
      return;
    }

    // we will do a "bridging" here from the current signals to the new API
    // format.
    let msg = null;

    if (data.signal_type === 'action-signal') {
      // This type of signals are just for tracking and information purposes,
      // will not change any logic on the offers module
      // This signals are not related to any offer, just "telemetry"
      msg = {
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
      msg = {
        type: 'offer-action-signal',
        // no data for now
        data: {
          offer_id: data.offer_id,
          // this is the signal we want to send
          action_id: data.element_id
        },
      };
    } else if (data.signal_type === 'remove-offer') {
      msg = {
        type: 'remove-offer',
        data: {
          offer_id: data.offer_id,
        },
      };
    }


    if (msg) {
      this.sendMessageToOffersCore(msg);
    } else {
      utils.log(`sendTelemetry: error: the message is null? invalid signal type? ${data.signal_type}`);
    }
  }

  //
  // subscribe to the storage events
  //
  onOffersCoreEvent(event) {
    // Ignore the event if this is not the most recent active window
    if (this.window !== utils.getWindow()) {
      return;
    }

    // check if we need to discard the event or not
    if (event.dest && event.dest.length > 0 && (event.dest.indexOf(ORIGIN_NAME) < 0)) {
      // we should not process this message
      return;
    }
    // we also have event data: event.data;
    const eventID = event.type;

    this._getAllOffers().then(() => {
      switch (eventID) {
        case 'push-offer': {
          // Auto open the panel
          autoTrigger = true;
          this.toolbarButtonElement.setAttribute('state', 'new-offers');

          if (offersHubTrigger === 'tooltip') {
            const signal = {
              type: 'offrz',
              view: 'box_tooltip',
              action: 'show',
            };

            const buttonArea = this.window.CustomizableUI.getWidget(this.toolbarButton.id).areaType;

            if (buttonArea === 'toolbar') {
              signal.location = 'toolbar';
            } else if (buttonArea === 'menu-panel') {
              signal.location = 'burger_menu';
            } else {
              signal.location = 'hidden';
            }
            utils.telemetry(signal);

            if (signal.location === 'hidden') {
              return; // Don't show the tooltip if the button is on the palette
            }

            const promise = UITour.getTarget(this.window, UI_TOUR_ID);
            const win = this.window;
            const myOptions = {
              closeButtonCallback: () => {
                const data = {
                  signal_type: 'action-signal',
                  element_id: 'tooltip_closed',
                };
                this.sendTelemetry(data);
              }
            };

            promise.then((target) => {
              const title = utils.getLocalizedString('offers_hub_tooltip_new_offer');
              const icon = `${config.baseURL}offers-cc/images/offers-cc-icon-white.svg`;

              if (buttonArea === 'menu-panel' && !isPlatformAtLeastInVersion('57.0')) {
                this.window.PanelUI.show();
              }

              UITour.hideHighlight(win); // Hide any visible highlight
              UITour.showInfo(win, target, title, '', icon, '', myOptions);
              this.isUITourOpening = true;
              if (!this.tooltipEventListenerAdded) {
                this.addTooltipEventListener();
                this.tooltipEventListenerAdded = true;
              }

              const msg = {
                type: 'action-signal',
                data: {
                  action_id: 'tooltip_shown',
                },
              };
              this.sendMessageToOffersCore(msg);
            }).catch(() => {});
          } else {
            this.openPanel();
          }
        }
          break;
        default:
          utils.log('invalid event from core type', eventID);
          break;
      }
    }).catch((err) => {
      utils.log('======= event: error: ', err);
    });
  }

  seenOffers(data) {
    seenOffersObj = data;
  }

  openPanel() {
    if (utils.getWindow() !== this.window) {
      return;
    }

    this.window.PanelUI.panel.setAttribute('noautohide', 'false');
    this.toolbarButton.showPopup(this.window);
  }

  closePanel() {
    const signal = {
      type: 'offrz',
      view: 'box',
      action: 'click',
      target: 'close',
    };

    utils.telemetry(signal);

    this.hideUITour();
    this.toolbarButton.hidePopup(this.window);
    if (this.window.PanelUI.panel.state === 'open') {
      this.window.PanelUI.showMainView();
    }
  }

  removeOffer() {
    const signal = {
      type: 'offrz',
      view: 'box',
      action: 'click',
      target: 'remove',
    };

    utils.telemetry(signal);
  }

  openURL(data) {
    if (data.isCallToAction) {
      const signal = {
        type: 'offrz',
        view: 'box',
        action: 'click',
        target: 'use',
      };

      utils.telemetry(signal);
    }
    const tab = utils.openLink(this.window, data.url, true);
    if (data.closePopup === true) {
      this.toolbarButton.hidePopup(this.window);
    }
    this.window.gBrowser.selectedTab = tab;
  }

  hideUITour() {
    if (!this.isUITourOpening) {
      return;
    }

    try {
      if (this.window.PanelUI.panel.state !== 'open') {
        UITour.hideInfo(this.window);
      }

      this.isUITourOpening = false;
      this.removeTooltipEventListener();
      this.tooltipEventListenerAdded = false;
    } catch (e) {
      // Expected exception when the UITour is not showing
    }
  }

}
