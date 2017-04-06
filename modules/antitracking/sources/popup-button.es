import { utils } from "core/cliqz";
import CliqzEvents from "core/events";

export default CliqzPopupButton;

function CliqzPopupButton(options) {
  this.CustomizableUI = Components.utils.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;

  this.name = options.name;
  this.actions = options.actions;

  var tbb = this.tbb = {
    id: this.name+'-button',
    type: 'view',
    viewId: this.name+'-panel',
    label: this.name,
    tooltiptext: this.name,
    tabs: {/*tabId: {badge: 0, img: boolean}*/},
    init: null,
    codePath: ''
  };

  function populatePanel(doc, panel) {
    panel.setAttribute('id', tbb.viewId);

    var iframe = doc.createElement('iframe');
    iframe.setAttribute('type', 'content');
    iframe.setAttribute('src', 'chrome://cliqz/content/antitracking/popup.html');
    panel.appendChild(iframe);

    function toPx(pixels) {
      return pixels.toString() + 'px';
    }

    function onPopupReady() {
      if (!iframe || !iframe.contentDocument) { return; }

      var body = iframe.contentDocument.body;
      var clientHeight = body.scrollHeight;

      iframe.style.height = toPx(clientHeight);
      panel.style.height = toPx(clientHeight + panel.boxObject.height - panel.clientHeight );

      // triggered when popup is opened
      options.actions.telemetry({ action: 'click', target: 'popup', includeUnsafeCount: true });
    }
    iframe.addEventListener('load', onPopupReady, true);
  }

  tbb.codePath = 'australis';
  tbb.CustomizableUI = this.CustomizableUI;
  tbb.defaultArea = this.CustomizableUI.AREA_NAVBAR;

  var styleURI = null;

  tbb.onBeforeCreated = function(doc) {
    var panel = doc.createElement('panelview');

    populatePanel(doc, panel);

    doc.getElementById('PanelUI-multiView').appendChild(panel);

    doc.defaultView.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils)
      .loadSheet(styleURI, 1);
  };

  var style = [
    '#' + tbb.id + '.off {',
      'list-style-image: url(',
        'chrome://cliqz/content/static/skin/images/atrack/anti-tracking-off.svg',
      ');',
    '}',
    '#' + tbb.id + ' {',
      'list-style-image: url(',
        'chrome://cliqz/content/static/skin/images/atrack/anti-tracking-on.svg',
      ');',
    '}',
    '#' + tbb.viewId + ',',
    '#' + tbb.viewId + ' > iframe {',
      'width: 400px;',
      'overflow: hidden !important;',
    '}'
  ];

  styleURI = Services.io.newURI(
      'data:text/css,' + encodeURIComponent(style.join('')),
      null,
      null
  );

  tbb.closePopup = function (tabBrowser) {
    this.CustomizableUI.hidePanelForNode(
        utils.getWindow().gBrowser.ownerDocument.getElementById(tbb.viewId)
    );
  }.bind(this);
}

CliqzPopupButton.prototype.updateView = function (win, clientHeight) {
  var panel = win.document.getElementById(this.tbb.viewId);
  var iframe = panel.querySelector("iframe");

    function toPx(pixels) {
      return pixels.toString() + 'px';
    }

    function onPopupReady() {
      if (!iframe || !iframe.contentDocument) { return; }

      var body = iframe.contentDocument.body;

      iframe.style.height = toPx(clientHeight);
      panel.style.height = toPx(clientHeight + panel.boxObject.height - panel.clientHeight );
    }

  onPopupReady();
}

CliqzPopupButton.prototype.updateState = function (win, turnOn) {
  if(!win) return;

  var button = win.document.getElementById(this.tbb.id);

  // if button is hidden via 'customize' menu, button will be undefined
  if (!button) return;

  if (turnOn) {
    button.classList.remove("off");
  } else {
    button.classList.add("off");
  }
}

CliqzPopupButton.prototype.setBadge = function (win, badgeText) {
  var button = win.document.getElementById(this.tbb.id);

  // if button is hidden via 'customize' menu, button will be undefined
  if (!button) return;

  if ( badgeText ) {
    button.setAttribute('badge', String(badgeText));
  } else {
    button.setAttribute('badge', '');
  }


  if ( !button.classList.contains('badged-button') ) {
    button.classList.add('badged-button');
  }

  utils.setTimeout(function () {
    var badge = button.ownerDocument.getAnonymousElementByAttribute(
      button,
      'class',
      'toolbarbutton-badge'
    );

    // when window is too small to display all icons, the anti-tracking badge
    // may be hidden behind a '>>' button. In this case, badge will be null.
    if(badge) {
      badge.style.cssText = 'background-color: #666; color: #fff;';
    }
  }, 250);
};

CliqzPopupButton.prototype.attach = function () {
  this.CustomizableUI.createWidget(this.tbb);
  this.setupCommunicationChannel();
};

CliqzPopupButton.prototype.destroy = function () {
  this.CustomizableUI.destroyWidget(this.tbb.id);
};

CliqzPopupButton.prototype.setupCommunicationChannel = function () {
  var channelName = this.name,
      actions = this.actions;

  function popupMessageHandler(msg) {
    var functionName = msg.message.functionName,
        functionArgs = msg.message.args,
        handler = actions[functionName];

    function callback(res) {
      CliqzEvents.pub(channelName+"-background", {
        id: msg.id,
        message: res
      });
    }

    if (!handler) { return; }

    handler(functionArgs, callback);
  }

  CliqzEvents.sub(channelName+"-popup", popupMessageHandler);
};
