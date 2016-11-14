import events from 'core/events';

export default function (originalBackground) {
  const background = Object.assign({}, originalBackground);
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
