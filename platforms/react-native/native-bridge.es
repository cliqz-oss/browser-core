
import { NativeModules, NativeEventEmitter } from 'react-native';
import events from '../core/events';

const nativeBridge = NativeModules.JSBridge;

/**
 * Makes a synchronous function behave like a promise
 * @param  {Function} fn synchronous function to wrap
 * @return {Function}    Function which wraps a call to this function in a Promise
 */
function makePromise(fn) {
  return function() {
    try {
      const ret = fn(...arguments);
      return Promise.resolve(ret);
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

class Bridge {

  constructor() {
    this.registeredActions = {};
    this.eventEmitter = new NativeEventEmitter(nativeBridge);
    this.eventEmitter.addListener('callAction', this.onAction.bind(this));
    this.eventEmitter.addListener('publishEvent', this.onEvent.bind(this));
  }

  onAction({id, action, args}) {
    const fn = this.registeredActions[action]
    if (!fn) {
      nativeBridge.replyToAction(id, {error: 'invalid action'});
      return;
    }

    const call = fn(...(args || []));
    call.then((ret) => {
      nativeBridge.replyToAction(id, {result: ret});
    });
    call.catch((e) => {
      console.log('onAction err', e);
      nativeBridge.replyToAction(id, {error: 'exception when running action'});
    })
  }

  onEvent({event, args}) {
    console.log('broadcast native event', event, args);
    events.pub(event, ...(args || []));
  }

  registerAction(name, fn, isPromise) {
    if (this.registeredActions[name] !== undefined) {
      throw new Error("action already exists");
    }
    this.registeredActions[name] = isPromise ? fn : makePromise(fn);
    nativeBridge.registerAction(name);
  }
}

const bridge = new Bridge();
export default bridge;
