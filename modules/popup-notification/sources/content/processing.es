/* eslint-disable import/prefer-default-export */
/* eslint object-curly-spacing: off */

import { getCouponsForm } from './utils';

const onApplyActions = (key) => {
  const m = {
    'insert-coupon-form': (window, config = {}) => {
      const result = getCouponsForm(window, config);
      const {ok, input, button} = result;
      if (!ok && !config.code) { return; }
      // Some sites track changes in the input field and for them
      // we should additionally notify that the value is changed.
      input.value = config.code;
      const changeEvent = window.document.createEvent('Event');
      changeEvent.initEvent('change', false, true);
      input.dispatchEvent(changeEvent);
      // sometimes clicks are emulated by other events
      const howToClick = config.clickEvent || 'click';
      if (button.click && (howToClick === 'click')) {
        button.click();
      } else {
        const clickEvent = window.document.createEvent('Event');
        clickEvent.initEvent(howToClick, true, true);
        button.dispatchEvent(clickEvent);
      }
    },
  };
  return (m[key] || (() => {}));
};

const preShowActions = (key) => {
  const m = {
    'try-to-find-coupon': (window, config = {}) => {
      const result = getCouponsForm(window, config);
      const {ok, input} = result;
      const shouldPreventRender = ok && Boolean(input.value);
      const newConfig = {...config, shouldHideButtons: !ok, shouldPreventRender};
      return {ok, config: newConfig};
    },
  };
  return (m[key] || ((w, config) => ({ok: true, config})));
};

export {
  onApplyActions,
  preShowActions
};
