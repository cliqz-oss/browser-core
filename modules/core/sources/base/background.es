import events from '../events';

// source: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
function completeAssign(target, ...sources) {
  sources.forEach(source => {
    let descriptors = Object.keys(source).reduce((descriptors, key) => {
      descriptors[key] = Object.getOwnPropertyDescriptor(source, key);
      return descriptors;
    }, {});
    // by default, Object.assign copies enumerable Symbols too
    if (typeof Symbol !== 'undefined') {
      Object.getOwnPropertySymbols(source).forEach(sym => {
        let descriptor = Object.getOwnPropertyDescriptor(source, sym);
        if (descriptor.enumerable) {
          descriptors[sym] = descriptor;
        }
      });
    }
    Object.defineProperties(target, descriptors);
  });
  return target;
}

export default function (originalBackground) {
  const background = completeAssign({}, originalBackground);
  const bgInit = background.init;
  const bgUnload = background.unload;
  const bgEvents = background.events;

  // bind actions to background object
  Object.keys(background.actions || {}).forEach(action => {
    background.actions[action] = background.actions[action].bind(background);
  });

  background.init = function init(...args) {
    const promise = Promise.resolve(bgInit.apply(background, args));

    Object.keys(bgEvents || {}).forEach(event => {
      bgEvents[event] = bgEvents[event].bind(background);
      events.sub(event, bgEvents[event]);
    });
    return promise;
  };

  background.unload = function unload(...args) {
    Object.keys(bgEvents || {}).forEach(event => {
      events.un_sub(event, bgEvents[event]);
    });

    bgUnload.apply(background, args);
  };

  return background;
}
