import console from './console';


/**
 * Implements a message queue, to force order in the processing of messages.
 * The queue is instantiated with a name and a callback (which can be async
 * and must return a Promise), and will feed in order the data received by
 * the `push` method.
 *
 * @constructor
 * @param {string} name - The name of the queue, useful for logging
 * @param {function} callback - Callback called on every message pushed in the
 *  queue. This can be a simple function, or async returning a Promise. In
 *  any case, all messages of the queue will be processed in the order of
 *  insertion.
 */
export default function (name, callback) {
  const queue = [];
  let globalResolve = null;

  /**
   * @function getNextData
   *
   * Define a function to wait for next available message and
   * call `callback` on it. If nothing is available when this
   * is called, then the `resolve` is registered and will be
   * resolve on next message.
   */
  const getNextData = () => new Promise((resolve) => {
    if (queue.length > 0) {
      // There is at least one message available in the queue.
      // Remove it from the queue and return it.
      resolve(queue.splice(0, 1)[0]);
    } else {
      // No message available in the queue, then register
      // the `resolve` which will be called when the next
      // message arrives.
      globalResolve = resolve;
    }
  });

  /**
   * @function registerCallbackOnData
   *
   * Define a listener on new messages, will continuously listen
   * on new messages (thanks to `getNextData`) and call callback
   * on each of them, in order.
   */
  const registerCallbackOnData = () => {
    getNextData()
      .then(([data, resolvePush]) => Promise.resolve(callback(data)).then(resolvePush))
      .catch(ex => console.error(`MessageQueue ${name} :: error: ${ex}`))
      .then(registerCallbackOnData);
  };

  /**
   * @function push
   *
   * Push a new message in the queue.
   *
   * @param {object} data - push a new message in the queue.
   */
  const push = (data) => {
    if (globalResolve !== null) {
      // A `getNextData` promise is waiting, so just resolve it with the
      // next message.
      const resolve = globalResolve;
      globalResolve = null;
      return new Promise(resolvePush => resolve([data, resolvePush]));
    }

    // If no `getNextData` is waiting, then push the message into the
    // queue for later processing.
    return new Promise((resolve) => {
      queue.push([data, resolve]);
    });
  };

  // Start listening to incoming messages
  registerCallbackOnData();

  // The only interface for this entity is the `push` function,
  // that will add a message in the queue, processed async by
  // the callback.
  return {
    push,
    getSize() { return queue.length; },
  };
}
