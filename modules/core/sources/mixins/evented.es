import utils from '../utils';

// TODO: use in TabObserver and others
export default base => class extends base {

  constructor() {
    super();
    this.eventListeners = {};
  }

  addEventListener(eventName, handler) {
    this.eventListeners[eventName] = this.eventListeners[eventName] || [];
    this.eventListeners[eventName].push(handler);
  }

  removeEventListener(eventName, handler) {
    const eventListeners = this.eventListeners[eventName] || [];
    const index = eventListeners.indexOf(handler);

    this.eventListeners[eventName] = eventListeners;

    if (index >= 0) {
      eventListeners.splice(index, 1);
    }
  }

  publishEvent(eventName, ...args) {
    const eventListeners = this.eventListeners[eventName] || [];
    eventListeners.forEach(handler => {
      utils.setTimeout(handler, 0, ...args);
    });
  }
};
