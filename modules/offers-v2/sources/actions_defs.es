/*

The purpose of this file will be to define a list of signals that we want to
track to avoid misspellings and have a common place where we will have listed
all the signals keys

 */

// track signals ids
const ActionID = {
  // New version names:
  //
  // this signal will be sent whenever the trigger that has an offer to show on its
  // actions is executed / evaluated.
  AID_OFFER_TRIGGERED: 'offer_triggered',
  // whenever the offer will be broadcasted / pushed to all the real estates when
  // the offers should be displayed (before, known as offer_added / offer_displayed).
  AID_OFFER_PUSHED: 'offer_pushed',
  // Notification type when an offer is pushed to the Reward box (Hub or offers-cc)
  // it can be a small tooltip, or full pop-up of the window
  AID_OFFER_NOTIF_T: 'offer_notif_tooltip',
  AID_OFFER_NOTIF_T_E: 'offer_notif_tooltip_extra',
  AID_OFFER_NOTIF_P: 'offer_notif_popup',
  // whenever the offer is filtered out by a filter rule info
  AID_OFFER_FILTERED: 'offer_filtered',
  // this signal will be sent every time a new "display" session ENDS on the given
  // real estate. It counts the number of opportunities we have to make a conversion.
  // This doesn't mean that showing the same offer in multiple tabs are multiple
  // display session but one (multiple showns will be counted in this case).
  AID_OFFER_DISPLAY_SESSION: 'offer_dsp_session',
  // this should be sent whenever the offer is shown to the user, not for the
  // first time but could be multiple times the same offer on the same url, for
  // example the panel, everytime there is a tab switch then we show and hide the
  // same offer multiple times.
  // Basically: graphic impressions.
  AID_OFFER_SHOWN: 'offer_shown',
  // whenever the offer is closed by timeout and not because of the user actively
  // close it.
  AID_OFFER_TIMEOUT: 'offer_timeout',
  // when the user close the offer actively pressing on the X button for example.
  AID_OFFER_CLOSED: 'offer_closed',
  // when the offer is removed from the container (any) so we should not keep track
  // of it anymore.
  AID_OFFER_REMOVED: 'offer_removed',
  // when the offer was properly removed from the DB (this is happening on the
  // processor mainly)
  AID_OFFER_DB_REMOVED: 'offer_db_removed',
  // when the user press on "More about cliqz offers" button, this is not related
  // usually to an offer, but can be associated (depending the real state).
  AID_OFFER_MORE_ABT_CLIQZ: 'more_about_cliqz',
  // when the user hovers over offer conditions (tooltip)
  AID_OFFER_MORE_INFO: 'offer_more_info',
  // when the user press on the main offer button (call to action).
  AID_OFFER_CALL_TO_ACTION: 'offer_ca_action',
  // whenever the user clicks on the real estate "copy code" part.
  AID_OFFER_CODE_COPIED: 'code_copied',
  // when the user click on a collapsed offer to expand it
  AID_OFFER_EXPANDED: 'offer_expanded',

  // extras
  //
  // hub
  // this signal will be sent at the same time that the offer_dsp_session but
  // only when the offer is displayed on the hub after the user actively opened the hub
  // (check confluence for more information).
  AID_OFFER_HUB_PULLED: 'offer_pulled',
  AID_OFFER_HUB_FB_NO_OPT: 'feedback_no',
  AID_OFFER_HUB_FB_OPT_1: 'feedback_option1',
  AID_OFFER_HUB_FB_OPT_2: 'feedback_option2',
  AID_OFFER_HUB_FB_OPT_3: 'feedback_option3',
  AID_OFFER_HUB_REMOVE_LINK: 'remove_offer_link',
  AID_OFFER_HUB_CANCEL_REMOVE_LINK: 'remove_offer_cancel',
  AID_OFFER_HUB_TOOLTIP_CLICKED: 'tooltip_clicked',
  AID_OFFER_HUB_TOOLTIP_CLOSED: 'tooltip_closed',
  AID_OFFER_HUB_TOOLTIP_SHOWN: 'tooltip_shown',
  AID_OFFER_HUB_POP_UP: 'hub_pop_up',
  AID_OFFER_HUB_OPEN: 'hub_open',
  AID_OFFER_HUB_CLOSED: 'hub_closed',
  AID_OFFER_HUB_SHOW_MORE_OFFERS: 'show_more_offers'

};


export default ActionID;
