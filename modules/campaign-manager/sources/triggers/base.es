import CliqzUtils from "core/utils";

export default class {

  constructor(id) {
    this.id = id;
    this._listeners = [];
  }

  addListener(callback) {
    this._listeners.push(callback);
  }

  notifyListeners() {
    this._listeners.forEach(function (listener) {
      CliqzUtils.setTimeout(function () {
        listener(this.id);
      }.bind(this), 0);
    }.bind(this));
  }
}
