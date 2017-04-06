import CliqzUtils from "../../core/utils";

export default class CliqzMsgHandler {
  constructor() {
    this._messageQueue = [];
    // message id is key
    this._callbacks = {};
  }

  enqueueMessage(message, callback) {
    const messageAlready = this._messageQueue.some(msg => {
      return msg.id === message.id;
    });

    if(!messageAlready) {
      this._messageQueue.push(message);
      this._callbacks[message.id] = callback;
      if (this._messageQueue.length === 1) {
        this._renderMessage(message);
      }
    }
  }

  dequeueMessage(message) {
    var i = this._messageQueue.indexOf(message);

    // same message, different object reference
    if (i === -1) {
      const msg = this._messageQueue.find(item => item.id === message.id);
      if (msg) {
        message = msg;
        i = this._messageQueue.indexOf(message);
      }
    }

    if (i === 0) {
      this.showNextMessage();
    } else if (i > -1) {
      this._messageQueue.splice(i, 1);
      delete this._callbacks[message.id];
    }
  }

  showNextMessage() {
    var message = this._messageQueue.shift();
    if (message) {
      delete this._callbacks[message.id];
      this._hideMessage(message);
      if (this._messageQueue.length > 0) {
        this._renderMessage(this._messageQueue[0]);
      }
    }
  }

  _renderMessage() {
    throw '_renderMessage not implemented';
  }

  _hideMessage() {
    throw '_hideMessage not implemented';
  }
}
