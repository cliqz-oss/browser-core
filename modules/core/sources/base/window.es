import { subscribe } from '../events';

export default class AppWindow {
  constructor({ windowId, window }) {
    this.windowId = windowId;
    this.window = window;
    this.eventHandlers = new Set();
  }

  init() {
    /*
     * wrap all event handlers into a check that verify
     * if we have a correct window
     */
    Object.keys(this.events).forEach((eventName) => {
      const handler = subscribe(eventName, (...args) => {
        if ((typeof args[0] !== 'object') || (args[0].windowId !== this.windowId)) {
          return;
        }

        this.events[eventName].call(this, ...args);
      });
      this.eventHandlers.add(handler);
    });
  }

  unload() {
    for (const handler of this.eventHandlers) {
      handler.unsubscribe();
      this.eventHandlers.delete(handler);
    }
  }
}
