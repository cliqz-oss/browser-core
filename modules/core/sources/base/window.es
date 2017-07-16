import { Window } from '../../platform/browser';
import Events from '../events';

export default function (config) {
  return class {
    constructor(...args) {
      this.windowId = new Window(args[0].window).id;
      this.events = Object.create(null);

      // bind actions to window object
      this.actions = Object.create(null);
      const actions = config.actions || {};
      Object.keys(actions).forEach((actionName) => {
        this.actions[actionName] = actions[actionName].bind(this);
      });
      config.constructor.call(this, ...args);

      const propertyBlacklist = [
        'constructor',
        'init',
        'unload',
        'actions',
        'events',
      ];
      const propsToCopy = Object.keys(config).filter(prop => propertyBlacklist.indexOf(prop) === -1);
      propsToCopy.forEach(prop => this[prop] = config[prop]);
    }

    init(...args) {
      const events = (config.events || {});

      Object.keys(events).forEach((eventName) => {
        // bind event handlers to window object
        this.events[eventName] = events[eventName].bind(this);

        Events.sub(eventName, (...args) => {
          const windowId = args[0].windowId;
          if (windowId !== this.windowId) {
            return;
          }
          this.events[eventName](...args);
        });
      });
      return config.init.call(this, ...args);
    }

    unload(...args) {
      return config.unload.call(this, ...args);
    }
  }
}
