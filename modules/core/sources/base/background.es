import { utils, events } from "core/cliqz";

export default function (background) {
  const bgInit = background.init,
        bgUnload = background.unload,
        bgEvents = background.events;
  let enabled;

  background.init = function init() {
    enabled = background.enabled.apply(background, arguments);

    if (!enabled) {
      return;
    }

    bgInit.apply(background, arguments);

    Object.keys(bgEvents).forEach( event => {

      bgEvents[event] = bgEvents[event].bind(background);
      events.sub(event, bgEvents[event]);
    });
  };

  background.unload = function unload() {
    if (!enabled) {
      return;
    }

    Object.keys(bgEvents).forEach( event => {
      events.un_sub(event, bgEvents[event]);
    });

    bgUnload.apply(background, arguments);
  };

  return background;
}
