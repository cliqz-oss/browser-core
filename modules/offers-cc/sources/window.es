import inject from '../core/kord/inject';
import { utils, events } from '../core/cliqz';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import background from './background';
import config from '../core/config';

const ORIGIN_NAME = 'offers-cc';

let seenOffersObj = {};
let autoTrigger = false;

export default class Win {
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
      sendActionSignal: this.sendActionSignal.bind(this),
      closePanel: this.closePanel.bind(this),
      openURL: this.openURL.bind(this),
      seenOffers: this.seenOffers.bind(this), // TODO still need this ?
      sendUserFeedback: this.sendUserFeedback.bind(this),
    };

    this.onOffersCoreEvent = this.onOffersCoreEvent.bind(this);

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
  }

  unload() {
    if (!background.is_enabled) {
      return;
    }
    events.un_sub('offers-send-ch', this.onOffersCoreEvent);
    removeStylesheet(this.window.document, this.cssUrl);
  }

  onButtonClicked() {
    this.showTooltip = false;

    const signal = {
      type: 'offrz',
      view: 'box',
      action: 'click',
      target: 'icon',
    };
    utils.telemetry(signal);
  }

  onPopupShowing() {
    // Now we use this pop-up to show the tooltip, but we don't want them to behave the same
    if (this.showTooltip) {
      return;
    }

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
    // Don't clear the red dot when the tooltip has shown
    if (this.showTooltip || this.toolbarButton.shownDurationTime <= 1000) {
      // nothing to do
      return;
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
  }

  getTooltipData(uiInfo) {
    // TODO: @mai make sure that all the fields in this uiInfo are existed
    if (uiInfo.notif_type === 'tooltip_extra') {
      let backgroundColor;
      if (uiInfo.template_data.styles && uiInfo.template_data.styles.background) {
        backgroundColor = uiInfo.template_data.styles.background;
      } else {
        const CTAUrl = uiInfo.template_data.call_to_action.url;
        const urlDetails = utils.getDetailsFromUrl(CTAUrl);
        const logoDetails = utils.getLogoDetails(urlDetails);
        backgroundColor = `#${logoDetails.backgroundColor}`;
      }

      let isExclusive = false;
      let isBestOffer = false;

      if (uiInfo.template_data.labels && uiInfo.template_data.labels.length) {
        isExclusive = uiInfo.template_data.labels.indexOf('exclusive') > -1;
        isBestOffer = uiInfo.template_data.labels.indexOf('best_offer') > -1;
      }

      const logoClass = uiInfo.template_data.logo_class || 'normal';
      const backgroundImage = uiInfo.template_data.logo_url;

      return {
        showTooltip: true,
        logo: uiInfo.template_data.logo_url,
        headline: uiInfo.template_data.headline || uiInfo.template_data.title,
        benefit: uiInfo.template_data.benefit,
        backgroundColor,
        isExclusive,
        isBestOffer,
        logoClass,
        backgroundImage,
      };
    }

    // Default generic tooltip
    return {
      showTooltip: true,
      isGeneric: true,
      headline: utils.getLocalizedString('offers_hub_tooltip_new_offer'),
      icon: `${config.baseURL}offers-cc/images/offers-cc-icon-white.svg`,
    };
  }

  // used for a first faster rendering
  getEmptyFrameAndData(data = {}) {
    if (data.hideTooltip) {
      this.showTooltip = false;
      const signal = {
        type: 'offrz',
        view: 'box_tooltip',
        action: 'click',
      };
      utils.telemetry(signal);

      const msg = {
        type: 'action-signal',
        data: {
          action_id: 'tooltip_clicked',
        },
      };
      this.sendMessageToOffersCore(msg);

      const msg2 = {
        type: 'action-signal',
        // no data for now
        data: {
          action_id: 'tooltip_closed'
        },
      };
      this.sendMessageToOffersCore(msg2);

      this.toolbarButtonElement.setAttribute('state', '');
    }

    if (this.showTooltip) {
      this.sendMessageToPopup({
        action: 'pushData',
        data: this.getTooltipData(this.uiInfo),
      });
    } else {
      if (!autoTrigger) {
        this.preferredOfferId = null;
      }
      this._getAllOffers(this.preferredOfferId).then((aData) => {
        if (aData.length === 0) {
          this.sendMessageToPopup({
            action: 'pushData',
            data: {
              noVoucher: true,
            }
          });

          return;
        }

        this.sendMessageToPopup({
          action: 'pushData',
          data: {
            vouchers: aData,
            showExpandButton: aData.some(result => result.preferred) && aData.length > 1,
          }
        });
      });
    }
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

  _getAllOffers(preferredOfferId = null) {
    const self = this;
    const args = {
      filters: {
        by_rs_dest: ORIGIN_NAME
      }
    };
    return this.offersV2.action('getStoredOffers', args).then((recentData) => {
      const parsedResult = [];
      let desiredOffer;
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

          // Default values for new data fields (for backward compability)
          let backgroundColor;
          let validity = {};
          let isExclusive = false;
          let isBestOffer = false;
          const logoClass = uiInfo.template_data.logo_class || 'normal';

          if (uiInfo.template_data.styles && uiInfo.template_data.styles.background) {
            backgroundColor = uiInfo.template_data.styles.background;
          } else {
            const CTAUrl = uiInfo.template_data.call_to_action.url;
            const urlDetails = utils.getDetailsFromUrl(CTAUrl);
            const logoDetails = utils.getLogoDetails(urlDetails);
            backgroundColor = `#${logoDetails.backgroundColor}`;
          }

          // Expect this to be always greater than Date.now();
          if (uiInfo.template_data.validity) {
            const expirationTime = uiInfo.template_data.validity;
            // Expect the expirationTime from backend to be always greater than Date.now()
            const timeDiff = Math.abs((expirationTime * 1000) - Date.now());

            let difference = Math.floor(timeDiff / 86400000);
            const isExpiredSoon = difference <= 2;
            let diffUnit = difference === 1 ? 'offers-expires-day' : 'offers-expires-days';

            if (difference < 1) {
              difference = Math.floor((timeDiff % 86400000) / 3600000);
              diffUnit = difference === 1 ? 'offers-expires-hour' : 'offers-expires-hours';

              if (difference < 1) {
                difference = Math.floor(((timeDiff % 86400000) % 3600000) / 60000);
                diffUnit = difference === 1 ? 'offers-expires-minute' : 'offers-expires-minutes';
              }
            }
            validity = {
              text: `${utils.getLocalizedString('offers-expires-in')} ${difference} ${utils.getLocalizedString(diffUnit)}`,
              isExpiredSoon,
            };
          }

          if (uiInfo.template_data.labels && uiInfo.template_data.labels.length) {
            isExclusive = uiInfo.template_data.labels.indexOf('exclusive') > -1;
            isBestOffer = uiInfo.template_data.labels.indexOf('best_offer') > -1;
          }

          const data = {
            created: elem.created_ts,
            state: offerState,
            template_name: uiInfo.template_name,
            template_data: uiInfo.template_data,
            offer_id: elem.offer_id,
            backgroundColor,
            isExclusive,
            isBestOffer,
            logoClass,
            validity,
          };

          if (data.offer_id !== preferredOfferId) {
            parsedResult.push(data);
          } else {
            data.preferred = true;
            desiredOffer = data;
          }
        }
      });

      // Sort the results by the most recent one
      parsedResult.sort((a, b) => (b.created - a.created));

      if (desiredOffer) {
        parsedResult.unshift(desiredOffer);
      }

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

  sendActionSignal(data) {
    const msg = {
      type: 'action-signal',
      data: {
        action_id: data.actionId,
      },
    };

    this.sendMessageToOffersCore(msg);
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

    if (data.signal_type === 'offer-action-signal') {
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

      const signal = {
        type: 'offrz',
        view: 'box',
        action: 'click',
        target: 'remove',
      };

      utils.telemetry(signal);
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

    this._getAllOffers().then((results) => {
      // TODO: Do we need this check anymore ? Yes
      if (results.length <= 0 || !results.some(result => result.state === 'new')) {
        return;
      }

      switch (eventID) {
        case 'push-offer': {
          const offersHubTrigger = event.data.offer_data.ui_info.notif_type || 'tooltip';
          const offerID = event.data.offer_data.offer_id;
          // Auto open the panel
          autoTrigger = true;
          this.toolbarButtonElement.setAttribute('state', 'new-offers');

          const notifMsg = {
            type: 'offer-action-signal'
          };

          if (offersHubTrigger === 'pop-up') {
            notifMsg.data = {
              action_id: 'offer_notif_popup',
              offer_id: offerID
            };
            this.sendMessageToOffersCore(notifMsg);
            this.showTooltip = false;
            this.preferredOfferId = offerID;
            this.openPanel();
          } else { // Open tooltip by default
            // TODO: change this when there is a new notif_type
            notifMsg.data = {
              action_id: `offer_notif_${offersHubTrigger}`,
              offer_id: offerID
            };

            const signal = {
              type: 'offrz',
              view: 'box_tooltip',
              action: 'show',
            };

            this.sendMessageToOffersCore(notifMsg);

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

            this.showTooltip = true;
            this.uiInfo = event.data.offer_data.ui_info;
            const msg = {
              type: 'action-signal',
              data: {
                action_id: 'tooltip_shown',
              },
            };
            this.sendMessageToOffersCore(msg);

            this.openPanel();
          }
          break;
        }
        default: {
          utils.log('invalid event from core type', eventID);
          break;
        }
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

    // TODO: check if we still need it, this is for the burger menu
    this.window.PanelUI.panel.setAttribute('noautohide', 'false');
    this.toolbarButton.showPopup(this.window);
  }

  closePanel() { // TODO: not using anymore?
    const signal = {
      type: 'offrz',
      view: 'box',
      action: 'click',
      target: 'close',
    };

    utils.telemetry(signal);

    this.toolbarButton.hidePopup(this.window);
    if (this.window.PanelUI.panel.state === 'open') {
      this.window.PanelUI.showMainView();
      // TODO: we need to find smth similar to open overflow menu
    }
  }

  openURL(data) {
    if (data.isCallToAction) {
      const msg = {
        type: 'offer-action-signal',
        data: {
          offer_id: data.offerId,
          action_id: 'offer_ca_action',
        },
      };
      this.sendMessageToOffersCore(msg);

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

  sendUserFeedback(data) {
    const feedback = {
      view: 'box',
      ...data,
    };

    utils.sendUserFeedback(feedback);
  }
}
