import Rx from '../../platform/lib/rxjs';

export default class BaseProvider {
  constructor(id) {
    this.id = id;
  }

  get empty() {
    return Rx.Observable.from([{
      results: [],
      state: 'done',
      provider: this.id,
    }]);
  }
}
