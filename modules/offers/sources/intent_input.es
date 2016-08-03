import LoggingHandler from 'offers/logging_handler';

const MODULE_NAME = 'intent_input';


////////////////////////////////////////////////////////////////////////////////
// buy intent session
function BuyIntentSession(id, sessionTimeMs) {
  this.id = id;
  this.sessionTimeMs = sessionTimeMs;
  this.rawEvents = [];
  this.sessions = [];
  this.currentSession = [];
  this.visitedDomainsIDs = new Set();
  this.checkoutEvents = [];
}

BuyIntentSession.prototype.ID = function() {
  return this.id;
};

BuyIntentSession.prototype.startedTimestamp = function() {
  return this.rawEvents.length === 0 ? -1 : this.rawEvents[0].ts;
};

BuyIntentSession.prototype.totalNumOfEvents = function() {
  return this.rawEvents.length;
};

BuyIntentSession.prototype.numOfSessions = function() {
  return this.sessions.length + (this.currentSession.length > 0 ? 1 : 0);
};

BuyIntentSession.prototype.numOfDifferentDomains = function() {
  return this.visitedDomainsIDs.size();
};

BuyIntentSession.prototype.getCurrentSession = function() {
  return this.currentSession;
};

BuyIntentSession.prototype.sessionList = function() {
  return this.sessions;
};

BuyIntentSession.prototype.lastEvent = function() {
  return (this.rawEvents.length === 0) ? null : this.rawEvents[this.rawEvents.length-1];
};

BuyIntentSession.prototype.firstIntentEvent = function() {
  return this.rawEvents.length === 0 ? null : this.rawEvents[0];
};

BuyIntentSession.prototype.firstCurrSessionEvent = function() {
  return this.currentSession.length === 0 ? null : this.currentSession[0];
};

BuyIntentSession.prototype.checkTimestampIsInCurrSession = function(ts) {
  if (this.currentSession.length === 0) {
    return true;
  }
  let firstEventInSession = this.firstCurrSessionEvent();
  let difftime = ts - firstEventInSession.ts;
  return difftime <= this.sessionTimeMs;
};

BuyIntentSession.prototype.thereWasACheckout = function() {
  return this.checkoutEvents.length > 0;
};

BuyIntentSession.prototype.checkoutsCount = function() {
  return this.checkoutEvents.length;
};

BuyIntentSession.prototype.lastCheckoutEvent = function() {
  return this.checkoutEvents.length === 0 ? null : this.checkoutEvents[this.checkoutEvents.length - 1];
};

BuyIntentSession.prototype.checkoutEvents = function() {
  return this.checkoutEvents;
};

BuyIntentSession.prototype.addEvent = function(event) {
  let isCheckoutEvent = event.checkout_flag;
  let domID = event.dom_id;
  let currTimestamp = event.ts;

  this.visitedDomainsIDs.add(domID);
  this.rawEvents.push(event);

  if (!this.checkTimestampIsInCurrSession(currTimestamp)) {
    this.sessions.push(this.currentSession);
    this.currentSession = [];
  }

  this.currentSession.push(event);
  if (isCheckoutEvent) {
    this.checkoutEvents.push(event);
  }

};









////////////////////////////////////////////////////////////////////////////////
export function IntentInput(sessionTimeSecs = 30*60,
                            buyIntentThresholdSecs = 60*60*24*10,
                            aClusterID = -1,
                            aNewIntentLifeCycleCb = undefined) {

  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'Created new IntentInput object');

  this.clusterID = aClusterID;
  this.sessionTimeMs = sessionTimeSecs * 1000;
  this.buyIntentTimeMs = buyIntentThresholdSecs * 1000;
  // timestamp for events that we need to discard:
  this.discardEvtTs = Date.now() - this.buyIntentTimeMs;
  this.isHistoryEvent = false;
  // the callback
  this.newIntentLifeCycleCb = aNewIntentLifeCycleCb;

  this.buyIntentIDCount = 0;

  this.currBuyIntent = new BuyIntentSession(this.buyIntentIDCount, this.sessionTimeMs);
  this.buyIntentSessions = [];
  // needed for filtering
  this.isNewEvent = true;
  this.lastTimestamp = -1.0;
  // flag to check if we need to finish the current buy intent session or not
  this.finishCurrentBuyIntentSession = false;
}

IntentInput.prototype.thereIsNewEvent = function() {
  return this.isNewEvent;
};

//
// @brief return the current buy intent session
//
IntentInput.prototype.currentBuyIntentSession = function() {
  return this.currBuyIntent;
};

//
// @brief flag the current buy intent session as done. This can be useful if
//        for example we detect that the user used the coupon or any other
//        coupon.
//
IntentInput.prototype.flagCurrentBuyIntentSessionAsDone = function() {
  this.finishCurrentBuyIntentSession = true;
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'flagCurrentBuyIntentSessionAsDone');
};


//
// @brief This method should be called whenever we got a new event or when we
//        read events from the past.
// @param event This event is a structure (object) with the following elements:
//        event_type: event type (we need to define which ones we will have if we have)
//        full_url: the full url of the event (landing url?)
//        ts: the timestamp of the event.
//        domain_id: the domain ID within the cluster.
//        checkout_flag: if the url matches to one of the regex on the cluster.
//        last_url: where the user was before.
//        referrer_url: if there are any referrer to this event.
//        extra: the extra information we want to add (TO BE DEFINED)
//        id: will be filled in in this function
//
IntentInput.prototype.feedWithEvent = function(event) {
  // reset the flag
  this.isNewEvent = true;

  // check if we should track the event or not
  let currTimestamp = event.ts;
  let timeDiff = currTimestamp - this.lastTimestamp;
  if (timeDiff === 0) {
    this.isNewEvent = false;
    return;
  }

  this.lastTimestamp = currTimestamp;

  // now we need to check if we need to add a new buy intent session or not
  let beginBuyIntentTime = this.currBuyIntent.startedTimestamp();
  beginBuyIntentTime = (beginBuyIntentTime >= 0) ? beginBuyIntentTime : currTimestamp;
  let buyIntentDuration = currTimestamp - beginBuyIntentTime;

  // check now if we need to start a new buy intent:
  // this will happen if:
  // 1) this event is a new session and the last session has event bought flag
  // or
  // 2) the buyIntentDuration > threshold
  let isNewBuyIntentSession = buyIntentDuration > this.buyIntentTimeMs;
  isNewBuyIntentSession = isNewBuyIntentSession || (this.currBuyIntent.thereWasACheckout() &&
                                                    this.currBuyIntent.checkTimestampIsInCurrSession(currTimestamp));
  isNewBuyIntentSession = isNewBuyIntentSession || this.finishCurrentBuyIntentSession;

  // LoggingHandler.LOG_ENABLED &&
  // LoggingHandler.info(MODULE_NAME,
  //   'isNewBuyIntentSession: ' + isNewBuyIntentSession +
  //   ' - beginBuyIntentTime: ' + beginBuyIntentTime +
  //   ' - currTimestamp: ' + currTimestamp +
  //   ' - buyIntentDuration: ' +  buyIntentDuration +
  //   ' - this.buyIntentTimeMs: ' + this.buyIntentTimeMs +
  //   ' - timeDiff: ' + timeDiff);

  if (isNewBuyIntentSession) {
    // reset the flag
    this.finishCurrentBuyIntentSession = false;
    // then we need to create a new one and replace the last one
    // NOTE: for now we will comment this:
    // this.buyIntentSessions.push(this.currBuyIntent);
    // since we dont want to have so much events and we are only working in the current
    // buy intent only
    //
    this.buyIntentIDCount++;
    this.currBuyIntent = new BuyIntentSession(this.buyIntentIDCount, this.sessionTimeMs);
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'generating new buy intent session!');
  }

  // now we just push the event there and thats all
  this.currBuyIntent.addEvent(event);

  // triggering the event that there is a new session here
  if (!this.isHistoryEvent &&
      (this.currBuyIntent.totalNumOfEvents() === 1) &&
      this.newIntentLifeCycleCb) {
    this.newIntentLifeCycleCb(this.clusterID);
  }
};

//
// @brief this method will be called to feed the current intent input with an
//        event from the history so we can filter if need it or if not then
//        we will call feedWithEvent() function.
//
IntentInput.prototype.feedWithHistoryEvent = function(event) {
  // we heck if we need to discard this event or not
  if (event.ts < this.discardEvtTs) {
    // LoggingHandler.LOG_ENABLED &&
    // LoggingHandler.info(MODULE_NAME, 'discarding event: ' + event.ts + ' < ' + this.discardEvtTs);
    return;
  }
  // LoggingHandler.LOG_ENABLED &&
  // LoggingHandler.info(MODULE_NAME, 'using event: ' + event.ts + ' < ' + this.discardEvtTs);

  // else we feed with this event
  this.isHistoryEvent = true;
  this.feedWithEvent(event);
  this.isHistoryEvent = false;
};




