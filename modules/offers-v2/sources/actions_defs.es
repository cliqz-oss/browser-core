/*

The purpose of this file will be to define a list of signals that we want to
track to avoid misspellings and have a common place where we will have listed
all the signals keys

 */

// track signals ids
const ActionID = {
  // this should be sent whenever the offer is shown to the user, not for the
  // first time but could be multiple times the same offer on the same url, for
  // example the banner, everytime there is a tab switch then we show and hide the
  // same offer multiple times.
  AID_OFFER_SHOWN: 'offer_shown',
  // the same than above, this is not only when is closed, but when for some reason
  // the offer is not being displayed anymore to the user (for example, tab-switch).
  AID_OFFER_HIDE: 'offer_hide',
  // whenever the offer is closed by timeout and not because of the user actively
  // close it.
  AID_OFFER_TIMEOUT: 'offer_timeout',
  // when the user close the offer actively pressing on the X button for example.
  AID_OFFER_CLOSED: 'offer_closed',
  // when the offer is removed from the container (any) so we should not keep track
  // of it anymore.
  AID_OFFER_REMOVED: 'offer_removed',
  // Whenever the user press on any "more information" button related to a particular
  // offer (if we provide the link to it). This is not related to the general cliqz-offers
  // but to a particular offer
  AID_OFFER_MORE_INFO: 'offer_more_info',
  // when the user press on "More about cliqz offers" button, this is not related
  // usually to an offer, but can be associated (depending the real state).
  AID_OFFER_MORE_ABT_CLIQZ: 'offer_more_cliqz',
  // when the user press on the main offer button (call to action).
  AID_OFFER_CALL_TO_ACTION: 'offer_ca_action',
  // whenever we create the offer for the first time or it is activated. Note that
  // this is not as before (that has the meaning of "created"), now is more "activated".
  AID_OFFER_ADDED: 'offer_added',
  // whenever an offer that is currently active gets inactive, for example if
  // an offer is closed or timed out or removed (while being active) then it will
  // be deactivated.
  AID_OFFER_DEACTIVATED: 'offer_deactivated',
  // whenever a currently active offer is being displayed in a new place or area.
  // This is of course coupled with OFFER_SHOWN (but OFFER_SHOWN > OFFER_DISPLAYED
  // in the majority of the cases).
  AID_OFFER_DISPLAYED: 'offer_displayed',
};


export default ActionID;
