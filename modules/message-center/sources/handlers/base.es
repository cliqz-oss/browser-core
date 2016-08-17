import CliqzUtils from "core/utils";

function CliqzMsgHandler () {
  this._messageQueue = [];
  // message id is key
  this._callbacks = {};
}

CliqzMsgHandler.prototype = {
  enqueueMessage: function (message, callback) {
    this._messageQueue.push(message);
    this._callbacks[message.id] = callback;
    if (this._messageQueue.length === 1) {
      this._renderMessage(message);
    }
  },

  dequeueMessage: function (message) {
    var i = this._messageQueue.indexOf(message);
    if (i === 0) {
      this.showNextMessage();
    } else if (i > -1) {
      this._messageQueue.splice(i, 1);
      delete this._callbacks[message.id];
    }
  },

  showNextMessage: function () {
    var message = this._messageQueue.shift();
    if (message) {
      delete this._callbacks[message.id];
      this._hideMessage(message);
      if (this._messageQueue.length > 0) {
        this._renderMessage(this._messageQueue[0]);
      }
    }
  },

  _renderMessage: function () {
    throw '_renderMessage not implemented';
  },

  _hideMessage: function () {
    throw '_hideMessage not implemented';
  }
};

export default CliqzMsgHandler;
