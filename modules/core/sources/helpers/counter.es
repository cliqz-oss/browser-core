import DefaultMap from './default-map';

export default class Counter extends DefaultMap {
  constructor(iterable = []) {
    super(() => 0);
    iterable.forEach(v => this.incr(v));
  }

  incr(key) {
    this.update(key, v => v + 1);
  }
}
