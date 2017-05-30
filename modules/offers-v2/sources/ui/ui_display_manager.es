import { utils, events } from '../../core/cliqz';
import LoggingHandler from '../logging_handler';
import OffersConfigs from '../offers_configs';
import { forEachWindow } from '../../platform/browser';
import { queryActiveTabs } from '../../core/tabs';
import inject from '../../core/kord/inject';

// TODO: remove all not needed logs

////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'ui_display_manager';


function linfo(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.info(MODULE_NAME, msg);
}
function lwarn(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.warning(MODULE_NAME, msg);
}
function lerr(msg) {
  LoggingHandler.LOG_ENABLED && LoggingHandler.error(MODULE_NAME, msg);
}


// Type of signals enum
//
var SignalType = {
  OFFER_DISPLAYED:              1,
  OFFER_HIDE:                   2,
  OFFER_DISPLAY_TIMEOUT:        3,
  UI_EVENT:                     4,
};




////////////////////////////////////////////////////////////////////////////////
//
// API:
// showOffer(offerInfo, ruleInfo);
// hideOffer(offerInfo);
export class UIDisplayManager {

  //////////////////////////////////////////////////////////////////////////////
  constructor(signalCallback, eventHandler) {
    this.offersModule = inject.module('offers-v2');

    this.signalCallback = signalCallback;
    this.eventHandler = eventHandler;
    // the offer information: offer_id -> {offer_data, rule_info}
    this.currentOffers = {};
    // the rule type function: map of rule_id -> {function: (data) -> rule}
    this.rulesFunMaps = {
      domains_match: {
        proc: this._ruleDomainMatchProc.bind(this),
        add_offer: this._ruleDomainMatchAdd.bind(this),
        remove_offer: this._ruleDomainMatchRemove.bind(this),
      },
      exact_match: {
        proc: this._ruleExactMatchProc.bind(this),
        add_offer: this._ruleExactMatchAdd.bind(this),
        remove_offer: this._ruleExactMatchRemove.bind(this),
      }
    };
    // the different internal maps to store data
    this.ruleDomainMatchData = {};
    this.ruleExactMatchData = {};
    //
    this.eventHandler.subscribeUrlChange(this._onLocationChange.bind(this));
    this.eventHandler.subscribeTabSelChange(this._onTabSelectionChanged.bind(this));

    // #EX-3958 we need to get a particular case here, for when the user go
    //          to page that is not an url, for example, freshtab / about:addons
    //          or whatever, any of the other triggers are being executed, hence
    //          we need to use the content:state-change event
    this._onContentStateChanged = this._onContentStateChanged.bind(this);
    events.sub('content:state-change', this._onContentStateChanged);
  }

  destroy() {
    this.eventHandler.unsubscribeUrlChange(this._onLocationChange.bind(this));
    this.eventHandler.unsubscribeTabSelChange(this._onTabSelectionChanged.bind(this));

    events.un_sub('content:state-change', this._onContentStateChanged);
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                API
  //////////////////////////////////////////////////////////////////////////////


  addOffer(offerInfo, ruleInfo) {
    linfo('Adding a new offer');

    if (!offerInfo || !ruleInfo) {
      lwarn('invalid args: !offerInfo || !ruleInfo');
      return false;
    }

    var ruleTypeFMap = this.rulesFunMaps[ruleInfo.type];
    if (!ruleTypeFMap) {
      lwarn('invalid rule type: ' + ruleInfo.type);
      return false;
    }

    // we should add the offer id into the template here since we need
    // to be able to track it for the signals
    offerInfo.template_data['offer_id'] = offerInfo.id;

    // TODO: analyze the offerInfo and ruleInfo data here
    this.currentOffers[offerInfo.id] = {
      id: offerInfo.id,
      offer_info: offerInfo,
      rule_info: ruleInfo,
      display_timer: null
    };

    // add it on the rule map
    ruleTypeFMap.add_offer(offerInfo.id, ruleInfo); // TODO: check ret val

    // show the offer in any of the current active tabs if any
    this._showOrHideOfferOnActiveTabs();

    return true;
  }

  //
  // @brief set a new rule info for an offer
  //
  setRuleInfoForOffer(offerID, newRuleInfo) {
    if (!newRuleInfo || !this.offerExists(offerID)) {
      lwarn('setRuleInfoForOfer: the offer not exists or null args: ' + offerID);
      return false;
    }
    const offerData = this.currentOffers[offerID];
    if (!offerData) {
      lerr('setRuleInfoForOffer: the offer with ID ' + offerID + ' is not on our system');
      return false;
    }

    // we remove it from the rule type
    const ruleInfo = offerData.rule_info;
    var currRuleTypeFMap = this.rulesFunMaps[ruleInfo.type];
    var newRuleTypeMap = this.rulesFunMaps[newRuleInfo.type];

    if (!currRuleTypeFMap || !newRuleTypeMap) {
      lwarn('setRuleInfoForOffer: invalid rule type: ' + ruleInfo.type +  ' or ' + newRuleInfo.type);
      return false;
    }

    currRuleTypeFMap.remove_offer(offerID, ruleInfo);

    // update the new rule info
    this.currentOffers[offerID].rule_info = newRuleInfo;

    newRuleTypeMap.add_offer(offerID, newRuleInfo);

    // we may need to show the offer here
    this._showOrHideOfferOnActiveTabs();

    return true;
  }

  //
  // @brief will remove the offer with the given of offer ID
  // @return true on success | false otherwise
  //
  removeOffer(offerID) {
    const offerData = this.currentOffers[offerID];
    if (!offerData) {
      lwarn('removeOffer: the offer with ID ' + offerID + ' is not on our system');
      return false;
    }

    // we remove it from the rule type
    const ruleInfo = offerData.rule_info;
    var ruleTypeFMap = this.rulesFunMaps[ruleInfo.type];

    if (!ruleTypeFMap) {
      lwarn('removeOffer: invalid rule type: ' + ruleInfo.type);
      return false;
    }

    lwarn('removeOffer: removing offer with ID ' + offerID + ' and ruleType: ' + ruleInfo.type);
    ruleTypeFMap.remove_offer(offerID, ruleInfo); // TODO: check ret val
    delete this.currentOffers[offerID];

    // remove timer
    this._removeDisplayTimer(offerID);

    this._showOrHideOfferOnActiveTabs();

    return true;
  }

  //
  // @brief check if an offer exissts
  //
  offerExists(offerID) {
    return (this.currentOffers[offerID]) ? true : false;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                          CALLBACKS / SIGNALS
  //////////////////////////////////////////////////////////////////////////////

  _onLocationChange(urlDetails, url) {
    // get the associated window and tab information here, since we will
    // need it anyway
    const tabInfo = this._getWinInfoFromUrl(url);
    if (!tabInfo) {
      lerr('_onLocationChange: the url doesnt match with any tab? this may happen...: ' + url);
      return;
    }

    linfo('_onLocationChange: ' + url);

    // check if it is the current tab, if its not then we should not show it
    if (!tabInfo.is_current_tab) {
      linfo('is not the current selected tab, skip showing this');
      return;
    }

    const offerID = this._getOfferFromUrl(url);

    // if we have an offer here we show it, if not do nothing
    linfo('_onLocationChange: there is (maybe) an offer with id ' + offerID + ' to show');

    if (offerID) {
      linfo('_onLocationChange: Showing offer with ID: ' + offerID + ' in url: ' + url);

      const offerDataPair = this.currentOffers[offerID];
      const offerData = (offerDataPair) ? offerDataPair.offer_info : null;
      this._showOffer(tabInfo.win, offerData)
      this._configureTimerIfNeeded(offerDataPair);
    } else {
      // there is no offer for this particular tab so we should then
      // hide it since any rule matched?
      linfo('_onLocationChange: no offer to show in this tab, hide');
      this._hideOffer(tabInfo.win);
    }
  }

  _onTabSelectionChanged(data) {
    // get the associated window and tab information here, since we will
    // need it anyway
    const tabInfo = this._getWinInfoFromUrl(data.url);
    if (!tabInfo) {
      lerr('We couldnt get the associated window for the current selected tab? '+
           'this should not happen never: ' + data.url);
      // GR-248: this can happen if the current tab for example was just opened.
      // for this reason we will just
      // TODO: OPTIMIZATION: we can do some more intelligent logic here
      this._showOrHideOfferOnActiveTabs();
      return;
    }

    linfo('tab selection changed: ' + data.url);

    const offerID = this._getOfferFromUrl(data.url);

    // if we have an offer here we show it, if not do nothing
    linfo('there is (maybe) an offer with id ' + offerID + ' to show');

    if (offerID) {
      linfo('Showing offer with ID: ' + offerID + ' in url: ' + data.url);

      const offerDataPair = this.currentOffers[offerID];
      const offerData = (offerDataPair) ? offerDataPair.offer_info : null;
      this._showOffer(tabInfo.win, offerData)
      this._configureTimerIfNeeded(offerDataPair);
    } else {
      // there is no offer for this particular tab so we should then
      // hide it since any rule matched?
      linfo('no offer to show in this tab, hide');
      this._hideOffer(tabInfo.win);
    }
  }

  //
  // @brief this method is called from the iframe (ui) to track the user interactions
  //
  onUICallback(data) {
    // signal_type: 'button_pressed',
    // button_id: data,
    // offer_id: offerID,

    const uiData = {
      evt_type: data.signal_type,
      // TODO: remove this, we need to generalize here
      element_id: data.element_id,
      extra: data.extra
    };

    // check the signal type
    if (uiData.evt_type === 'offer_shown') {
      this._emitSignal(SignalType.OFFER_DISPLAYED, data.offer_id, uiData);
    } else if (uiData.evt_type === 'offer_hide') {
      this._emitSignal(SignalType.OFFER_HIDE, data.offer_id, uiData);
    } else {
      this._emitSignal(SignalType.UI_EVENT, data.offer_id, uiData);
    }

  }

  //////////////////////////////////////////////////////////////////////////////
  //                          PRIVATE METHODS
  //////////////////////////////////////////////////////////////////////////////

  _showOffer(win, offerData) {
    if (!win || !offerData) {
      const varValues = String(win ? '' : 'win is Null ') +
                        String(offerData ? ' ' : 'offerData is null');
      lwarn('the win object or offerData is null: ' + varValues);
      return;
    }

    // TODO: ensure that the offerData is properly formatted

    // communicate with the window sending the offer data
    this.offersModule.windowAction(win, 'showOfferCoreHandler', offerData);
  }

  _hideOffer(win) {
    if (!win) {
      lwarn('the win object is null');
      return;
    }

    // this will just hide the current offer on the given tab
    this.offersModule.windowAction(win, 'hideOfferCoreHandler');
  }

  _emitSignal(signalType, offerID, data) {
    if (this.signalCallback) {
      this.signalCallback({signal_type: signalType, offer_id: offerID, data: data});
    }
  }

  // this method will check if we need to set the timer now or not (if it is)
  // the first time we show the offer or not
  // #GR-259
  _configureTimerIfNeeded(offerInfo) {
    // check if we have rule information
    if (!offerInfo || !offerInfo.rule_info) {
      return;
    }
    // if we have already a timer or no time to set => nothing to do
    if (offerInfo.display_timer || !offerInfo.rule_info.display_time_secs) {
      return;
    }
    // add timer
    var timeToSet = offerInfo.rule_info.display_time_secs;
    if (OffersConfigs.OFFERS_OVERRIDE_TIMEOUT > 0) {
      timeToSet = OffersConfigs.OFFERS_OVERRIDE_TIMEOUT;
    }
    this._addDisplayTimer(offerInfo, timeToSet);
  }

  //
  // @brief will return an offer applying any rule type with the given urlData
  //
  _getOfferFromUrl(aUrl) {
    const urlData = {
      url_details: utils.getDetailsFromUrl(aUrl),
      url: aUrl,
    };
    // process all the rules functions types and check if there is an offer or
    // not for this
    var offerID = null;
    for (var ruleType in this.rulesFunMaps) {
      if (!this.rulesFunMaps.hasOwnProperty(ruleType)) {
        continue;
      }

      // check if we have a offer associated to this data and rule
      offerID = this.rulesFunMaps[ruleType].proc(urlData);
      if (offerID) {
        // we have, so we show it and return
        // TODO: only one offer support here
        break;
      }
    }
    return offerID;
  }

  //
  // @brief Will return the current selected window only
  //
  _getWinInfoFromUrl(aUrl) {
    var dataRef = null;
    try {
      forEachWindow(win => {
        if (dataRef) {
          return;
        }
        // TODO: is the active win?
        const isActiveWin = win === utils.getWindow();
        if (isActiveWin) {
          const openTabs = queryActiveTabs(win);
          openTabs.forEach(data => {
              const url = data.url;
              if (aUrl === url) {
                dataRef = {
                  win: win,
                  url: url,
                  is_current_tab: data.isCurrent
                };
                return;
              }
          });
        }
      });
    } catch (ee) {
      // do nothing, return empty set
      lerr(MODULE_NAME, ee);
    }
    return dataRef;
  }

  //
  // @brief This method will check if a particular offer should be shown in any
  //        of the current active tabs of all windows
  //
  _showOrHideOfferOnActiveTabs() {
    // get all tabs active tabs from the windows
    var activeTabsInfo = [];
    try {
      forEachWindow(win => {
        const openTabs = queryActiveTabs(win);
        openTabs.forEach(data => {
          if (data.isCurrent) {
            activeTabsInfo.push({win: win, tab: data});
          }
        });
      });
    } catch (ee) {
      lerr(MODULE_NAME, ee);
    }

    // show or hide on the given tabs
    activeTabsInfo.forEach(tabInfo => {
      const offerID = this._getOfferFromUrl(tabInfo.tab.url);
      if (offerID) {
        linfo('Showing offer with ID: ' + offerID + ' in url: ' + tabInfo.tab.url);

        const offerDataPair = this.currentOffers[offerID];
        const offerData = (offerDataPair) ? offerDataPair.offer_info : null;
        this._showOffer(tabInfo.win, offerData)
        this._configureTimerIfNeeded(offerDataPair);
      } else {
        // there is no offer for this particular tab so we should then
        // hide it since any rule matched?
        linfo('no offer to show in this tab, hide');
        this._hideOffer(tabInfo.win);
      }
    });
  }

  // rule functions

  _ruleDomainMatchProc(data) {
    // get the domain from the url details
    const domain = data.url_details.domain;
    return this.ruleDomainMatchData[domain];
  }

  _ruleDomainMatchAdd(offerID, ruleData) {
    linfo('url match offer being added, with id: ' + offerID + ' - ruleData: ' +
          JSON.stringify(ruleData));

    // we will process here the rule and the offer
    if (!offerID || !ruleData) {
      lerr('_ruleDomainMatchAdd: The offerID or ruleData is null');
      return false;
    }

    // we just simply add the rule
    // TODO: we are not handling multiple offers for the same domain at the same
    // time. We need to do this in the future
    for (var i = 0; i < ruleData.url.length; ++i) {
      const domain = ruleData.url[i];
      if (this.ruleDomainMatchData.hasOwnProperty(domain)) {
        lerr('_ruleDomainMatchAdd: there is already a offer for this domain: ' + domain);
        continue;
      }
      // add this
      this.ruleDomainMatchData[domain] = offerID;
    }
    return true;
  }

  _ruleDomainMatchRemove(offerID, ruleData) {
    linfo('_ruleDomainMatchRemove: url match offer being removed, with id: ' +
          offerID + ' - ruleData: ' + JSON.stringify(ruleData));


    if (!offerID || !ruleData) {
      lerr('_ruleDomainMatchRemove: The offerID or ruleData is null');
      return false;
    }

    // TODO: we are not handling multiple offers for the same domain at the same
    // time. We need to do this in the future
    for (var i = 0; i < ruleData.url.length; ++i) {
      const domain = ruleData.url[i];
      if (!this.ruleDomainMatchData.hasOwnProperty(domain)) {
        lerr('_ruleDomainMatchRemove: no offer with url ' + domain + ' found');
        continue;
      }
      delete this.ruleDomainMatchData[domain];
    }
    return true;
  }

  //
  // exact match
  _ruleExactMatchProc(data) {
    // get the domain from the url details
    const fullUrl = data.url;
    return this.ruleExactMatchData[fullUrl];
  }

  _ruleExactMatchAdd(offerID, ruleData) {
    linfo('url exact match offer being added, with id: ' + offerID + ' - ruleData: ' +
          JSON.stringify(ruleData));

    // we will process here the rule and the offer
    if (!offerID || !ruleData) {
      lerr('_ruleExactMatchAdd: The offerID or ruleData is null');
      return false;
    }

    // we just simply add the rule
    // TODO: we are not handling multiple offers for the same url at the same
    // time. We need to do this in the future
    for (var i = 0; i < ruleData.url.length; ++i) {
      const fullUrl = ruleData.url[i];
      if (this.ruleExactMatchData.hasOwnProperty(fullUrl)) {
        lerr('_ruleExactMatchAdd: there is already a offer for this domain: ' + fullUrl);
        continue;
      }
      // add this
      this.ruleExactMatchData[fullUrl] = offerID;
    }
    return true;
  }

  _ruleExactMatchRemove(offerID, ruleData) {
    linfo('_ruleExactMatchRemove: url match offer being removed, with id: ' +
          offerID + ' - ruleData: ' + JSON.stringify(ruleData));


    if (!offerID || !ruleData) {
      lerr('_ruleExactMatchRemove: The offerID or ruleData is null');
      return false;
    }

    // TODO: we are not handling multiple offers for the same domain at the same
    // time. We need to do this in the future
    for (var i = 0; i < ruleData.url.length; ++i) {
      const fullUrl = ruleData.url[i];
      if (!this.ruleExactMatchData.hasOwnProperty(fullUrl)) {
        lerr('_ruleExactMatchRemove: no offer with url ' + fullUrl + ' found');
        continue;
      }
      delete this.ruleExactMatchData[fullUrl];
    }
    return true;
  }

  // track the time
  _addDisplayTimer(offerInfo, timeSecs) {
    if (!offerInfo || !timeSecs) {
      lwarn('_addDisplayTimer: no timer or offer set');
      return;
    }
    const offerID = offerInfo.id;

    // clear current one if any
    this._removeDisplayTimer(offerID);

    linfo('setting timer for offer ' + offerID + ' with time: ' + timeSecs + ' seconds');

    this.currentOffers[offerID].display_timer = utils.setTimeout(function () {
      // check if we are showing the add, if not we just remove it
      this._displayTimeout(offerID);
    }.bind(this), timeSecs * 1000);

  }

  _removeDisplayTimer(offerID) {
    // check if we have it
    var offerData = this.currentOffers[offerID];
    if (!offerData || !offerData.display_timer) {
      return;
    }
    utils.clearTimeout(offerData.display_timer);
    delete offerData.display_timer;
    offerData.display_timer = null;
  }

  _displayTimeout(offerID) {
    // check if we have the offer or is an old event
    var offerData = this.currentOffers[offerID];
    if (!offerData || !offerData.display_timer) {
      lwarn('_displayTimeout: an offer we dont have?: ' + offerID);
      return;
    }
    linfo('_displayTimeout: for offerID: ' + offerID);

    // remove the offer here to not be shown anymore and also send a signal
    this._emitSignal(SignalType.OFFER_DISPLAY_TIMEOUT, offerID, {});
    this.removeOffer(offerID);
  }

  //////////////////////////////////////////////////////////////////////////////
  _onContentStateChanged({ url, originalUrl, triggeringUrl }) {
    try {
      if (!url || url.indexOf('file://') < 0) {
        // nothing to do, is not an internal page
        return;
      }
      // else we will refresh the current page / tab
      linfo('_onContentStateChanged: we are on a local page?');
      this._showOrHideOfferOnActiveTabs();
    } catch (e) {
      lerr('_onContentStateChanged: something bad happened here... ' + e);
    }
  }

}

export default SignalType;
