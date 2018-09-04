import inject from '../core/kord/inject';
import events from '../core/events';
import utils from '../core/utils';
import prefs from '../core/prefs';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import background from './background';
import config from '../core/config';
import { getMessage } from '../core/i18n';
import { getDetailsFromUrl } from '../core/url';
import logger from './logger';

const ORIGIN_NAME = 'offers-cc';
let autoTrigger = false;

export default class Win {
  core = inject.module('core');
  offersV2 = inject.module('offers-v2');

  constructor(settings) {
    if (!background.is_enabled) {
      return;
    }

    this.window = settings.window;
    this.settings = settings.settings;
    this.channel = settings.settings.channel;
    this.cssUrl = `${config.baseURL}offers-cc/styles/xul.css`;

    this.actions = {
      getEmptyFrameAndData: this.getEmptyFrameAndData.bind(this),
      resize: this.resizePopup.bind(this),
      sendTelemetry: this.sendTelemetry.bind(this),
      sendOfferActionSignal: this.sendOfferActionSignal.bind(this),
      sendActionSignal: this.sendActionSignal.bind(this),
      closePanel: this.closePanel.bind(this),
      openURL: this.openURL.bind(this),
      seenOffer: this.seenOffer.bind(this), // TODO still need this ?
      sendUserFeedback: this.sendUserFeedback.bind(this),
    };

    this.onOffersCoreEvent = this.onOffersCoreEvent.bind(this);
    this.onOffersCoreRegistrationEvent = this.onOffersCoreRegistrationEvent.bind(this);

    this.toolbarButton = background.toolbarButton;
    this.toolbarButton.addWindow(this.window, this.actions, {
      onClick: this.onButtonClicked.bind(this),
      onViewShowing: this.onPopupShowing.bind(this),
      onViewHiding: this.onPopupHiding.bind(this),
    });

    this.toolbarButtonElement = this.window.document.getElementById(this.toolbarButton.id);
    this.handleMouseEvent = this.handleMouseEvent.bind(this);
  }

  init() {
    if (!background.is_enabled) {
      return;
    }

    // stylesheet for offers-cc button
    addStylesheet(this.window.document, this.cssUrl);
    events.sub('offers-send-ch', this.onOffersCoreEvent);
    events.sub('offers-re-registration', this.onOffersCoreRegistrationEvent);
    this._registerToOffersCore();
    this.toolbarButtonElement.addEventListener('mouseenter', this.handleMouseEvent);
    this.toolbarButtonElement.addEventListener('mouseleave', this.handleMouseEvent);
  }

  unload() {
    if (!background.is_enabled) {
      return;
    }
    events.un_sub('offers-send-ch', this.onOffersCoreEvent);
    events.un_sub('offers-re-registration', this.onOffersCoreRegistrationEvent);
    this._unregisterFromOffersCore();
    removeStylesheet(this.window.document, this.cssUrl);
    this.toolbarButtonElement.removeEventListener('mouseenter', this.handleMouseEvent);
    this.toolbarButtonElement.removeEventListener('mouseleave', this.handleMouseEvent);
  }

  handleMouseEvent(event) {
    this.reshowPopup = event.type === 'mouseenter' && this.showTooltip;
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
      if (this.reshowPopup) {
        this.reshowPopup = false;
        setTimeout(() => {
          this.toolbarButtonElement.click();
        }, 0);
      }

      return;
    }

    this.toolbarButtonElement.setAttribute('state', '');
    // else we will change the state of all offers

    const signal = {
      type: 'offrz',
      view: 'box',
      action: 'hide',
      show_duration: this.toolbarButton.shownDurationTime,
    };
    utils.telemetry(signal);

    const msg = {
      type: 'action-signal',
      data: {
        action_id: 'hub_closed',
      },
    };
    this.sendMessageToOffersCore(msg);

    autoTrigger = false;
  }

  getTooltipData(uiInfo) {
    // TODO: @mai make sure that all the fields in this uiInfo are existed
    if (uiInfo.notif_type === 'tooltip_extra') {
      let backgroundColor;
      if (uiInfo.template_data.styles && uiInfo.template_data.styles.headline_color) {
        backgroundColor = uiInfo.template_data.styles.headline_color;
      } else {
        const CTAUrl = uiInfo.template_data.call_to_action.url;
        const urlDetails = getDetailsFromUrl(CTAUrl);
        const logoDetails = utils.getLogoDetails(urlDetails);
        backgroundColor = `#${logoDetails.backgroundColor}`;
      }

      const logoClass = uiInfo.template_data.logo_class || 'normal';
      const backgroundImage = uiInfo.template_data.logo_url;

      return {
        showTooltip: true,
        logo: uiInfo.template_data.logo_url,
        headline: uiInfo.template_data.headline || uiInfo.template_data.title,
        benefit: uiInfo.template_data.benefit,
        labels: uiInfo.template_data.labels,
        backgroundColor,
        logoClass,
        backgroundImage,
      };
    }

    // Default generic tooltip
    return {
      showTooltip: true,
      isGeneric: true,
      headline: getMessage('offers_hub_tooltip_new_offer'),
      icon: `${config.baseURL}offers-cc/images/offers-cc-icon-white.svg`,
    };
  }

  _mapTelemetryStyle(notifType) {
    let style = 'generic';
    if (notifType === 'tooltip_extra') {
      style = 'on_site';
    }

    return style;
  }

  _mapTelemetryLocation(buttonArea) {
    let location;

    switch (buttonArea) {
      case 'toolbar':
        location = 'toolbar';
        break;
      case 'menu-panel':
        location = 'burger_menu';
        break;
      default:
        location = 'hidden';
        break;
    }

    return location;
  }

  debugging() {
    const maxOffersNum = 200;
    const fetch = utils.fetchFactory();
    fetch('http://offers-api-stage.clyqz.com:81/portal/api/v1/debug/offers',
      { credentials: 'include', cache: 'no-store' }
    ).then(res => res.json())
      .then((allOffers) => {
        const desiredOffers = allOffers
          .filter(offer => offer.rs_dest.includes('offers-cc'))
          .slice(0, maxOffersNum)
          .map(offer => ({
            offer_id: offer.offer_id,
            offer_info: {
              ui_info: offer.ui_info,
            },
          }));

        this.sanitizeData(desiredOffers).then((offersData) => {
          this.sendMessageToPopup({
            action: 'pushData',
            data: {
              vouchers: offersData,
            }
          });
        });
      });
  }

  // used for a first faster rendering
  getEmptyFrameAndData(data = {}) {
    if (data.hideTooltip) {
      this.showTooltip = false;

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

    /*
      Turn on/off debugging mode.
      To turn it on:
      - eu-central vpn is required.
      - Visit http://offers-api-stage.clyqz.com:81/portal/api/v1/debug/offers
      and save the credential
      - Set the pref.
    */
    if (prefs.get('offersCCDebuggingMode', false)) {
      this.debugging();
      return;
    }

    if (this.showTooltip) {
      this.preferredOfferId = null;
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

        if (data.hideTooltip) {
          autoTrigger = true;
          const signal = {
            type: 'offrz',
            view: 'box_tooltip',
            action: 'click',
            style: this._mapTelemetryStyle(aData[0].notif_type),
          };

          utils.telemetry(signal);
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

  seenOffer(data) {
    const offerId = data.offer_id;

    const msgSession = {
      type: 'offer-action-signal',
      data: {
        action_id: 'offer_dsp_session',
        offer_id: offerId,
      },
    };
    this.sendMessageToOffersCore(msgSession);

    if (!autoTrigger) {
      const msgPulled = {
        type: 'offer-action-signal',
        data: {
          action_id: 'offer_pulled',
          offer_id: offerId,
        },
      };
      this.sendMessageToOffersCore(msgPulled);
    }

    const msgShown = {
      type: 'offer-action-signal',
      data: {
        action_id: 'offer_shown',
        offer_id: offerId,
      },
    };
    this.sendMessageToOffersCore(msgShown);

    const msgState = {
      type: 'change-offer-state',
      // no data for now
      data: {
        offers_ids: [offerId],
        new_state: 'old'
      }
    };
    this.sendMessageToOffersCore(msgState);
  }

  sanitizeData(recentData, preferredOfferId = null) {
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
        const logoClass = uiInfo.template_data.logo_class || 'normal';

        if (uiInfo.template_data.styles && uiInfo.template_data.styles.headline_color) {
          backgroundColor = uiInfo.template_data.styles.headline_color;
        } else {
          const CTAUrl = uiInfo.template_data.call_to_action.url;
          const urlDetails = getDetailsFromUrl(CTAUrl);
          const logoDetails = utils.getLogoDetails(urlDetails);
          backgroundColor = `#${logoDetails.brandTxtColor}`;
        }

        // Expect this to be always greater than Date.now();
        const expirationTime = elem.offer_info.expirationMs ?
          (elem.created_ts + elem.offer_info.expirationMs) / 1000 :
          uiInfo.template_data.validity;
        if (expirationTime) {
          // Expect the expirationTime from backend to be always greater than Date.now()
          const timeDiff = Math.abs((expirationTime * 1000) - Date.now());

          let difference = Math.floor(timeDiff / 86400000);
          const isExpiredSoon = difference <= 2;
          let diffUnit = difference === 1 ? 'offers_expires_day' : 'offers_expires_days';

          if (difference < 1) {
            difference = Math.floor((timeDiff % 86400000) / 3600000);
            diffUnit = difference === 1 ? 'offers_expires_hour' : 'offers_expires_hours';

            if (difference < 1) {
              difference = Math.floor(((timeDiff % 86400000) % 3600000) / 60000);
              diffUnit = difference === 1 ? 'offers_expires_minute' : 'offers_expires_minutes';
            }
          }
          validity = {
            text: `${getMessage('offers_expires_in')} ${difference} ${getMessage(diffUnit)}`,
            isExpiredSoon,
          };
        }

        const data = {
          created: elem.created_ts,
          state: offerState,
          template_name: uiInfo.template_name,
          template_data: uiInfo.template_data,
          offer_id: elem.offer_id,
          backgroundColor,
          logoClass,
          validity,
          notif_type: uiInfo.notif_type || 'tooltip'
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

    return Promise.resolve(parsedResult);
  }

  _getAllOffers(preferredOfferId = null) {
    const args = {
      filters: {
        by_rs_dest: ORIGIN_NAME
      }
    };

    return this.offersV2.action('getStoredOffers', args)
      .then(recentData => this.sanitizeData(recentData, preferredOfferId));
  }

  /**
   * will send a message to the offers-core
   * @param  {[type]} msg  object containing the following parameters:
   *                       - type (signal type): remove-offer, change-offer-state,
                                                 offer-action-signal, action-signal
   *                       - data (depending on the type)
   * @return {[type]}      [description]
   */
  sendMessageToOffersCore(msg) {
    if (!msg || !msg.type) {
      logger.log('Error: invalid message');
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
    const vote = data.vote;
    const comments = data.comments;
    const action = data.action || 'click';

    const signal = {
      type: 'offrz',
      view: 'box',
      action,
      target: data.target,
    };

    if (vote) {
      signal.vote = vote;
    }
    if (comments) {
      signal.comments = comments;
    }

    utils.telemetry(signal);
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

  sendOfferActionSignal(data) {
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
    }


    if (msg) {
      this.sendMessageToOffersCore(msg);
    } else {
      logger.log(`sendOfferActionSignal: error: the message is null? invalid signal type? ${data.signal_type}`);
    }
  }

  onOffersCoreRegistrationEvent(event) {
    if (event && event.type === 'broadcast') {
      this._registerToOffersCore();
    }
  }

  //
  // subscribe to the storage events
  //
  onOffersCoreEvent(event) {
    logger.log(event, 'event');
    // Ignore the event if this is not the most recent active window
    if (this.window !== utils.getWindow()) {
      return;
    }

    // check if we need to discard the event or not
    if (event.dest && event.dest.length > 0 && (event.dest.indexOf(ORIGIN_NAME) < 0)) {
      // we should not process this message
      logger.log('we should not process this message');
      return;
    }
    // we also have event data: event.data;
    const eventID = event.type;

    switch (eventID) {
      case 'push-offer': {
        const offersHubTrigger = event.data.offer_data.ui_info.notif_type || 'tooltip';
        const offerID = event.data.offer_data.offer_id;
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

          // Auto open the panel
          autoTrigger = true;
          this.openPanel();
        } else if (offersHubTrigger === 'dot') {
          notifMsg.data = {
            action_id: 'offer_notif_dot',
            offer_id: offerID
          };

          this.sendMessageToOffersCore(notifMsg);
          this.showTooltip = false;
        } else { // Open tooltip by default
          // TODO: change this when there is a new notif_type
          notifMsg.data = {
            action_id: `offer_notif_${offersHubTrigger}`,
            offer_id: offerID
          };

          const buttonArea = this.window.CustomizableUI.getWidget(this.toolbarButton.id).areaType;
          const signal = {
            type: 'offrz',
            view: 'box_tooltip',
            action: 'show',
            style: this._mapTelemetryStyle(offersHubTrigger),
            location: this._mapTelemetryLocation(buttonArea),
          };

          utils.telemetry(signal);

          if (signal.location === 'hidden') {
            return; // Don't show the tooltip if the button is on the palette
          }

          this.sendMessageToOffersCore(notifMsg);

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
        logger.log('invalid event from core type', eventID);
        break;
      }
    }
  }

  openPanel() {
    const containerId = this.toolbarButtonElement.parentElement.id;
    // No need to show pop-up when Offrz hub icon is in Overflow list
    if (utils.getWindow() !== this.window || containerId.indexOf('widget-overflow') !== -1) {
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

      if (data.elemId) {
        const extraMsg = {
          type: 'offer-action-signal',
          data: {
            offer_id: data.offerId,
            action_id: `offer_${data.elemId}`
          },
        };
        this.sendMessageToOffersCore(extraMsg);
      }
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

    this.core.action('sendUserFeedback', feedback);
  }

  _unregisterFromOffersCore() {
    this.offersV2.action('unregisterRealEstate', { realEstateID: ORIGIN_NAME }).catch(() => {});
  }

  _registerToOffersCore() {
    this.offersV2.action('registerRealEstate', { realEstateID: ORIGIN_NAME }).catch(() => {});
  }
}
