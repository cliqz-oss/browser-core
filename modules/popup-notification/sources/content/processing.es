/* eslint-disable import/prefer-default-export */
/* eslint object-curly-spacing: off */

import { getCouponsForm } from './utils';

const onApplyActions = (key) => {
  const m = {
    'insert-coupon-form': (window, config = {}) => {
      const result = getCouponsForm([...window.document.querySelectorAll('form')]);
      const {ok, input, button} = result;
      if (!ok && !config.code) { return; }
      input.value = config.code;
      if (button.click) { button.click(); }
    },
  };
  return (m[key] || (() => {}));
};

const preShowActions = (key) => {
  const m = {
    'try-to-find-coupon': (window, config) => {
      const result = getCouponsForm([...window.document.querySelectorAll('form')]);
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
