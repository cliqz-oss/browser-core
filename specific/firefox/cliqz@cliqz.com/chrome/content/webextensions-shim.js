// for tests
if (typeof Components === "undefined") {
  Components = {
    fake: true,
    utils: {
      import: function () {}
    }
  };
  CLIQZ = {
    CliqzEvents: {
      sub: function () {

      }
    },
    CliqzUtils: {
      getLocalizedString: function (key) {
        return key;
      }
    }
  }
}

Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
var CliqzUtils = CLIQZ.CliqzUtils;
var CliqzEvents = CLIQZ.CliqzEvents;

var messageCallbacks = Object.create(null);

CliqzEvents.sub("antitracking-background", function (res) {
  if (!messageCallbacks[res.id]) { return; }

  messageCallbacks[res.id](res.message);
  delete messageCallbacks[res.id];
});

var chrome = {
  runtime: {
    sendMessage: function(message, callback) {
      var messageId = CliqzEvents.nextId();
      messageCallbacks[messageId] = callback;

      CliqzEvents.pub("antitracking-popup", {
        message: message,
        id: messageId
      });
    }
  },

  i18n: {
    getMessage: CliqzUtils.getLocalizedString
  }
};
