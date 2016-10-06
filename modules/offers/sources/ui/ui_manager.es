import { utils } from 'core/cliqz';
import { loadFileFromChrome } from 'offers/utils';
import LoggingHandler from 'offers/logging_handler';
import CliqzHandlebars from 'core/templates';


////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'ui_manager';


////////////////////////////////////////////////////////////////////////////////
function getIDNameFromOfferID(offerID) {
  return 'offers-' + offerID;
}



////////////////////////////////////////////////////////////////////////////////
export function UIManager() {
  // the current offer map clusterID -> offer
  this.currentOfferMap = {};
  // the callbacks list
  this.callbacks = null;
  // the template of handle bars already compiled
  this.leadHandlebarTemplate = null;
  this.voucherHandlebarTemplate = null;

  // load the html and compile the handlebars directly here only once
  var self = this;
  loadFileFromChrome(['offers', 'voucher.html']).then(html => {
    self.voucherHandlebarTemplate = CliqzHandlebars.compile(html);
  }).catch(err => { LoggingHandler.LOG_ENABLED && LoggingHandler.error(MODULE_NAME, err)});
  loadFileFromChrome(['offers', 'deal.html']).then(html => {
    self.leadHandlebarTemplate = CliqzHandlebars.compile(html);
  }).catch(err => { LoggingHandler.LOG_ENABLED && LoggingHandler.error(MODULE_NAME, err)});


}


//////////////////////////////////////////////////////////////////////////////
//                          "PRIVATE" METHODS
//////////////////////////////////////////////////////////////////////////////


//
// @brief this method will create the string / document fragment we need to
//        construct for the offerInfo itself
//
UIManager.prototype.createCouponDisplay = function(offerInfo) {
  if (!this.voucherHandlebarTemplate) {
    // nothing to do here..
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'we still dont have the handlebar template here...');
    return;
  }

  const coupon = offerInfo.voucher_data;

  var document = CliqzUtils.getWindow().document;
  if (!document) {
    return false;
  }

  // check if we have the element here already to not re-create it
  var messageContainer = document.getElementById('cqz-voucher-msg-cont');
  if (!messageContainer) {
    messageContainer = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
  }
  var documentFragment = document.getElementById('cqz-voucher-doc-frag');
  if (!documentFragment) {
    documentFragment = document.createDocumentFragment();
  }

  messageContainer.innerHTML = this.voucherHandlebarTemplate({title: coupon.title, code: coupon.code, desc: coupon.desc, min_order_value: coupon.min_order_value, valid_for: coupon.valid_for, image_url: coupon.image_url});
  documentFragment.appendChild(messageContainer);

  return documentFragment;
};

//
// @brief this method will create the string / document fragment we need to
//        construct for the offerInfo itself
//
UIManager.prototype.createLeadDisplay = function(offerInfo) {
  if (!this.leadHandlebarTemplate) {
    // nothing to do here..
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'we still dont have the handlebar template here...');
    return;
  }

  const coupon = offerInfo.voucher_data;

  var document = CliqzUtils.getWindow().document;
  if (!document) {
    return false;
  }

  // check if we have the element here already to not re-create it
  var messageContainer = document.getElementById('cqz-voucher-msg-cont');
  if (!messageContainer) {
    messageContainer = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
  }
  var documentFragment = document.getElementById('cqz-voucher-doc-frag');
  if (!documentFragment) {
    documentFragment = document.createDocumentFragment();
  }

  messageContainer.innerHTML = this.leadHandlebarTemplate({title: coupon.title, desc: coupon.desc, image_url: coupon.image_url});
  documentFragment.appendChild(messageContainer);

  return documentFragment;
};


//
// @brief This is create a notification which is suited for vouchers and
//        show it
//
UIManager.prototype.showVoucherNotificationInCurrentWindow = function(currWindow, offerInfo, filterGoToOffer=false) {
  let self = this;

  // get the notification box and build whatever we want to show (style) here.
  var notificationContent = this.createCouponDisplay(offerInfo);
  if (!notificationContent) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'we couldnt create the coupon display',
                         LoggingHandler.ERR_INTERNAL);
    return false;
  }

  // build the buttons callbacks
  var buttons = [];

  // store the current offer id we want to track
  const offerID = offerInfo.offer_id;

  if (!filterGoToOffer) {
    // show coupon
    buttons.push({
      label : 'Zum Angebot',
      callback : function () {
        if (self.callbacks.show_coupon) {
          return self.callbacks.show_coupon(offerID);
        }
      }
    });
  }

  buttons.push({
    label : 'Ueber CLIQZ-Angebote',
    callback : function () {
        if (self.callbacks.information) {
          return self.callbacks.information(offerID);
        }
      }
  });

  // now get the notification box and create it
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();

  const offerNameID = getIDNameFromOfferID(offerInfo['offer_id']);
  var notification = box.appendNotification(notificationContent,
                                            offerNameID,
                                            null,
                                            box.PRIORITY_WARNING_MEDIUM,
                                            buttons,
                                            function(reason) {
                                              if (self.callbacks.extra_events) {
                                                return self.callbacks.extra_events(reason, offerID);
                                              }
                                            });

  notification.style.backgroundColor = "#f6f6f6";
  notification.style.borderBottom = "1px solid #dedede";
  notification.classList.add("cqz-voucher-holder");

  // get the coupon element and set the callback when the user click on it
  let couponElement = notification.boxObject.firstChild.getElementsByClassName("cliqz-coupon")[0];
  if (couponElement) {
    couponElement.onclick = function () {
      CliqzUtils.copyResult(couponElement.innerHTML);
      if (self.callbacks.cp_to_clipboard) {
        try {

          let copyText = notification.boxObject.firstChild.getElementsByClassName("cqz-copy-coupon")[0];
          if (copyText) {
            copyText.style.display = 'inline';
          }
        } catch (ee) {
          LoggingHandler.LOG_ENABLED &&
          LoggingHandler.error(MODULE_NAME, "can't attach click listener to couponElement" + ee);
        }
        self.callbacks.cp_to_clipboard(offerID);
      }
    };
  }

  try {
    // closing button
    let notificationBox = currWindow.gBrowser.getNotificationBox().getElementsByTagName("notification")[0];
    let notificationBoxClosing = notificationBox.boxObject.firstChild.getElementsByTagName("xul:toolbarbutton")[0];
    notificationBoxClosing.addEventListener("click", function(){
      if (self.callbacks.close_btn_clicked) {
        self.callbacks.close_btn_clicked(offerID);
      }
    });
  } catch (e) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'We couldnt get the code button from the ui to link it with ' +
                         'the copyToClipboard feature. Description: ' + e,
                         LoggingHandler.ERR_INTERNAL);
  }

  return true;
};


//
// @brief This is create a notification which is suited for leads and shows it
//
UIManager.prototype.showLeadNotificationInCurrentWindow = function(currWindow, offerInfo) {
  let self = this;

  // get the notification box and build whatever we want to show (style) here.
  var notificationContent = this.createLeadDisplay(offerInfo);
  if (!notificationContent) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'we couldnt create the lead display',
                         LoggingHandler.ERR_INTERNAL);
    return false;
  }

    // store the current offer id we want to track
  const offerID = offerInfo.offer_id;

  // build the buttons callbacks
  var buttons = [];

  // show coupon
  buttons.push({
    label : 'Zum Angebot',
    callback : function () {
      if (self.callbacks.show_coupon) {
        return self.callbacks.show_coupon(offerID);
      }
    }
  });

  buttons.push({
    label : 'Ueber CLIQZ-Angebote',
    callback : function () {
      if (self.callbacks.show_coupon) {
        return self.callbacks.information(offerID);
      }
    }
  });


  // now get the notification box and create it
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();

  const offerNameID = getIDNameFromOfferID(offerInfo['offer_id']);
  var notification = box.appendNotification(notificationContent,
                                            offerNameID,
                                            null,
                                            box.PRIORITY_CRITICAL_MEDIUM,
                                            buttons,
                                            function(reason) {
                                              if (self.callbacks.extra_events) {
                                                return self.callbacks.extra_events(reason, offerID);
                                              }
                                            });

  notification.classList.add("cqz-voucher-holder");


  try {
    // closing button
    let notificationBox = currWindow.gBrowser.getNotificationBox().getElementsByTagName("notification")[0];
    let notificationBoxClosing = notificationBox.boxObject.firstChild.getElementsByTagName("xul:toolbarbutton")[0];
    notificationBoxClosing.addEventListener("click", function(){
      if (self.callbacks.close_btn_clicked) {
        self.callbacks.close_btn_clicked(offerID);
      }
    });
  } catch (e) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'We couldnt get the code button from the ui to link it with ' +
                         'the copyToClipboard feature. Description: ' + e,
                         LoggingHandler.ERR_INTERNAL);
  }

  return true;
};


//////////////////////////////////////////////////////////////////////////////
//                          "PUBLIC" METHODS
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
//
// @brief configure callbacks
// @param callbacks: an object with the following properties.
//  {
//    'show_coupon': callback(offerID), -> will show the coupon and redirect to web.
//    'not_interested': callback(offerID) -> will just cancel this and maybe don't show it again for a while.
//    'information': callback(offerID) -> when the user clicks on the information icon
//    'extra_events': callback(offerID) -> any other extra events from the notification bar
//    'close_btn_clicked': callback(offerID) -> when user closed on the X button
//    // internal callbacks
//    'on_offer_shown' : callback(offerID) -> when we actually show an offer
//    'on_offer_hide' : callback(offerID) -> when the offer is hiden
//    'cp_to_clipboard' : callback(offerID) -> when the coupon is clicked to save it on the clipboard
//  }
//
UIManager.prototype.configureCallbacks = function(callbacks) {
  this.callbacks = callbacks;
};


//////////////////////////////////////////////////////////////////////////////
//
// @brief check if there is an offer from a specific cluster being shown in this
//        window
// @return true if it is | false otherwise
//
UIManager.prototype.isOfferForClusterShownInCurrentWindow = function(clusterID) {
  const offerInfo = this.currentOfferMap[clusterID];
  if (offerInfo === undefined) {
    return false;
  }

  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return false;
  }
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();

  // try first to remove the current one if we have one so we only show one element
  let currentNotification = box.getNotificationWithValue(getIDNameFromOfferID(offerInfo['offer_id']));
  return (!currentNotification) ? false : true;
};

//////////////////////////////////////////////////////////////////////////////
//
// @brief show an offer in the current window and set it as the current one
// @param filterGoToOffer will indicate if we need to add this button or not
//                        in the list
// @param filterOffer will be used to avoid showing the current offer
//
UIManager.prototype.showOfferInCurrentWindow = function(offerInfo, filterGoToOffer=false, filterOffer=false) {
  if (filterOffer) {
    // nothing to do
    return false;
  }

  if (!this.callbacks) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'no callbacks set yet... we cannot add any coupon to the UI');
    return false;
  }

  // else we need to add it here
  const clusterID = offerInfo['appear_on_cid'];
  this.currentOfferMap[clusterID] = offerInfo;

  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return false;
  }

  let offerType = offerInfo.voucher_data.template_type;
  let retCode = false;
  if(offerType === "voucher") {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, '#showVoucherNotificationInCurrentWindow');
    retCode = this.showVoucherNotificationInCurrentWindow(currWindow, offerInfo, filterGoToOffer);
  } else if(offerType === "deal") {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, '#showLeadNotificationInCurrentWindow');
    retCode = this.showLeadNotificationInCurrentWindow(currWindow, offerInfo, filterGoToOffer);
  } else {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, '#showOffer unknown type or undefined');
  }

  if (!retCode) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, '#retCode false?');
    return retCode;
  }

  // call the callback that we are showing the offer here
  const offerID = offerInfo.offer_id;
  if (this.callbacks.on_offer_shown) {
    this.callbacks.on_offer_shown(offerID, offerType);
  }

  return retCode;
};


//////////////////////////////////////////////////////////////////////////////
//
// @brief hide the current coupon of the current window
//
UIManager.prototype.hideOfferOfClusterFromCurrentWindow = function(clusterID) {
  const offerInfo = this.currentOfferMap[clusterID];
  if (!offerInfo || offerInfo['offer_id'] === undefined) {
    return false;
  }

  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return false;
  }
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();
  const offerNameID = getIDNameFromOfferID(offerInfo['offer_id']);

  // try first to remove the current one if we have one so we only show one element
  let currentNotification = box.getNotificationWithValue(offerNameID);
  if (currentNotification) {
    box.removeNotification(currentNotification);

    // call the callback notifying this
    if (this.callbacks.on_offer_hide) {
      this.callbacks.on_offer_hide(offerInfo);
    }
  }
};
