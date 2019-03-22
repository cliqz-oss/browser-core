/*

The purpose of this file will be to define a list of signals that we want to
track to avoid misspellings and have a common place where we will have listed
all the signals keys

 */

// track signals ids
const ActionID = {
  // New version names:
  //
  // when the offer is added to the database for the first time
  AID_OFFER_DB_ADDED: 'offer_added',
  // this signal will be sent whenever the trigger that has an offer to show on its
  // actions is executed / evaluated.
  AID_OFFER_TRIGGERED: 'offer_triggered',
  // whenever the offer will be broadcasted / pushed to all the real estates when
  // the offers should be displayed (before, known as offer_added / offer_displayed).
  AID_OFFER_PUSHED: 'offer_pushed',
  // whenever the offer will be broadcasted / pushed to all the real estates and
  // it has a deep link and a corresponding image. In addition to 'offer_pushed'
  AID_DYNAMIC_OFFER_PUSHED: 'dynamic_offer_pushed',
  // Notification type when an offer is pushed to the Reward box (Hub or offers-cc)
  // it can be a small tooltip, or full pop-up of the window
  AID_OFFER_NOTIF_T: 'offer_notif_tooltip',
  AID_OFFER_NOTIF_T_E: 'offer_notif_tooltip_extra',
  AID_OFFER_NOTIF_P: 'offer_notif_popup',
  AID_OFFER_NOTIF_D: 'offer_notif_dot',
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
  // when the offer expires and is erased on the db
  AID_OFFER_EXPIRED: 'offer_expired',
  // when the user press on "More about cliqz offers" button, this is not related
  // usually to an offer, but can be associated (depending the real state).
  AID_OFFER_MORE_ABT_CLIQZ: 'more_about_cliqz',
  // when the user hovers over offer conditions (tooltip)
  AID_OFFER_MORE_INFO: 'offer_more_info',
  // when the user press on the main offer button (call to action).
  AID_OFFER_CALL_TO_ACTION: 'offer_ca_action',
  // the next signals are the same than offer_ca_action but identifies if the user
  // clicked on different elements we will see this with this signals
  AID_OFFER_LOGO: 'offer_logo',
  AID_OFFER_PICTURE: 'offer_picture',
  AID_OFFER_BENEFIT: 'offer_benefit',
  AID_OFFER_HEADLINE: 'offer_headline',
  AID_OFFER_TITLE: 'offer_title',
  AID_OFFER_DESCRIPTION: 'offer_description',

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
  AID_OFFER_HUB_SHOW_MORE_OFFERS: 'show_more_offers',

  // only from dropdown
  // positional extra signals (depending where is it shown, but not attached)
  AID_OFFER_DD_OFFER_SHOWN_1: 'offer_shown_1',
  AID_OFFER_DD_OFFER_SHOWN_2: 'offer_shown_2',
  AID_OFFER_DD_OFFER_CA_ACTION_1: 'offer_ca_action_1',
  AID_OFFER_DD_OFFER_CA_ACTION_2: 'offer_ca_action_2',
  AID_OFFER_DD_OFFER_DSP_SESSION_1: 'offer_dsp_session_1',
  AID_OFFER_DD_OFFER_DSP_SESSION_2: 'offer_dsp_session_2',
  // when the offer is attached:
  AID_OFFER_DD_OFFER_SHOWN_ATTACHED: 'offer_shown_attached',
  AID_OFFER_DD_OFFER_CA_ACTION_ATTACHED: 'offer_ca_action_attached',
  AID_OFFER_DD_OFFER_DSP_SESSION_ATTACHED: 'offer_dsp_session_attached',

  AID_LANDING: 'landing',
  AID_PAGE_IMP: 'page_imp',
  AID_SUCCESS: 'success',
  AID_PAYMENT: 'payment',
  AID_CART: 'cart',
  AID_COUPON_EMPTY: 'coupon_empty',
  AID_COUPON_OWN_USED: 'coupon_own_used',
  AID_COUPON_OTHER_USED: 'coupon_other_used',
  AID_COUPON_AUTOFILL_FIELD_APPLY_ACTION: 'coupon_autofill_field_apply_action',
  AID_COUPON_AUTOFILL_FIELD_CANCEL_ACTION: 'coupon_autofill_field_cancel_action',
  AID_COUPON_AUTOFILL_FIELD_FAILED: 'coupon_autofill_field_failed',
  AID_COUPON_AUTOFILL_FIELD_COPY_CODE: 'coupon_autofill_field_copy_code',
  AID_COUPON_AUTOFILL_FIELD_SHOW: 'coupon_autofill_field_show',
  AID_COUPON_AUTOFILL_FIELD_OUTSIDE_ACTION: 'coupon_autofill_field_outside_action',
  AID_COUPON_AUTOFILL_FIELD_X_ACTION: 'coupon_autofill_field_x_action',
  AID_COUPON_AUTOFILL_FIELD_UNKNOWN: 'coupon_autofill_field_unknown',
  AID_COUPON_AUTOFILL_SUCCESS_USE: 'coupon_autofill_field_success_use',
  AID_COUPON_AUTOFILL_ERROR_USE: 'coupon_autofill_field_error_use',
  AID_COUPON_AUTOFILL_APPLICATION_NOT_FOUND: 'coupon_autofill_field_application_not_found',

  // Processor

  AID_OFFER_FILTERED_HARD_PREFIX: 'filtered_by_hard_',
  AID_OFFER_FILTERED_VALIDIDTY: 'filtered_by_hard_filterByValidity',
  AID_OFFER_FILTERED_ABTEST: 'filtered_by_hard_filterByABTest',
  AID_OFFER_FILTERED_REALESTATE: 'filtered_by_hard_filterByRealEstates',
  AID_OFFER_FILTERED_GEO: 'filtered_by_hard_filterByGeo',
  AID_OFFER_FILTERED_CATEGORIES: 'filtered_by_hard_filterByCategories',

  AID_OFFER_FILTERED_EXP_PREFIX: 'filter_exp__',
  AID_OFFER_FILTERED_CONTEXT: 'filtered_by_context',

  AID_OFFER_FILTERED_GLOBAL_BLACKLIST: 'filtered_by_global_blacklist',
  AID_OFFER_FILTERED_OFFER_BLACKLIST: 'filtered_by_offer_blacklist',
  AID_OFFER_FILTERED_COMPETE: 'filtered_by_compete',

  AID_OFFER_CC_HIDDEN: 'reward_box_missing_button', // Button hidden by user

  // Ghostery
  AID_GH_CA_ACTION_0: 'offer_ca_action_0',
  AID_GH_CLICK_HOTDOG: 'offer_click_hotdog',
  AID_GH_CLICK_SPECIFIC: 'offer_click_specific',
  AID_GH_CLICK_SPECIFIC_NEW: 'offer_click_specific_new',
  AID_GH_CLOSED_CARD: 'offer_closed_card',
  AID_GH_CLOSED_HOTDOG: 'offer_closed_hotdog',
  AID_GH_DSP_SESSION_0: 'offer_dsp_session_0',
  AID_GH_FIRST_LEARN: 'offer_first_learn',
  AID_GH_FIRST_OPTIN: 'offer_first_optin',
  AID_GH_FIRST_OPTLATER: 'offer_first_optlater',
  AID_GH_FIRST_OPTOUT: 'offer_first_optout',
  AID_GH_NOTIFICATION_HOTDOG: 'offer_notification_hotdog',
  AID_GH_RETURN_HUB: 'offer_return_hub',
  AID_GH_SETTINGS: 'offer_settings',
  AID_GH_SHOWN_0: 'offer_shown_0',
};

export default ActionID;
