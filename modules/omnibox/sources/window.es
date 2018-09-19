import omniboxapi from '../platform/omnibox/omnibox';

export default class Win {
  actions = {
    setUrlbarValue: async (value, options = {}) => {
      const opts = typeof options === 'object' ?
        options :
        { visibleValue: options };

      let ifMatches = opts.match || (() => true);

      if (ifMatches instanceof RegExp) {
        const re = ifMatches;
        ifMatches = s => re.test(s);
      } else if (typeof ifMatches !== 'function') {
        const m = ifMatches.toString();
        ifMatches = s => m === s;
      }

      const { currentValue, visibleValue } = await omniboxapi.get();

      if (ifMatches(currentValue)) {
        omniboxapi.update({ value });
      }

      if (ifMatches(visibleValue)) {
        let newValue = value;
        if (Object.prototype.hasOwnProperty.call(opts, 'visibleValue')) {
          if (opts.visibleValue) {
            newValue = opts.visibleValue;
          } else {
            newValue = '';
          }
        }

        omniboxapi.update({ visibleValue: newValue });
        this.urlbar.mInputField.value = newValue;
      }

      if (opts.focus) {
        this.urlbar.mInputField.focus();
      }
    },
  };

  constructor(settings) {
    this.settings = settings;
  }

  init() {}

  unload() {}
}
