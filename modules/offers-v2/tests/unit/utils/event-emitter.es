// Mock for `EventEmitter` from `core/event-emitter.es`
// sync, only for one event name

class EventEmitter {
  constructor() {
    this.cbs = [];
  }

  on(_, f) {
    this.cbs.push(f);
  }

  unsubscribe(_, f) {
    this.cbs = this.cbs.filter(cb => cb !== f);
  }

  emit(_, ...args) {
    this.cbs.forEach(cb => cb(...args));
  }
}

module.exports = EventEmitter;
