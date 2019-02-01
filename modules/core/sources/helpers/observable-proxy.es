import { Observable } from 'rxjs';

export default class ObservableProxy {
  constructor() {
    this.observable = Observable.create((o) => {
      this._next = o.next.bind(o);
    });
  }

  next(ev) {
    if (!this._next) {
      return;
    }
    this._next({
      ...ev,
      ts: Date.now(),
    });
  }
}
