import CliqzUtils from '../../core/utils';

export default class TriggerBase {
  constructor(id) {
    this.id = id;
    this._listeners = [];
  }

  addListener(callback) {
    this._listeners.push(callback);
  }

  notifyListeners() {
    this._listeners.forEach((listener) => {
      CliqzUtils.setTimeout(() => {
        listener(this.id);
      }, 0);
    });
  }
}
