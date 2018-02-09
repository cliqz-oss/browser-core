import { Services, safeGlobal, window } from '../globals';
import config from '../../core/config';

export default (bundle, exportedSymbol) => {
  const url = `${config.baseURL}vendor/${bundle}`;
  let lib = null;

  const load = () => {
    if (lib === null) {
      // in case we load in chrome:// pages, the lib may be loaded on a window
      if (typeof window !== 'undefined') {
        if (window[exportedSymbol]) {
          lib = window[exportedSymbol];
          return;
        }
      }

      const target = {
        window: safeGlobal,
      };

      Services.scriptloader.loadSubScriptWithOptions(url, { target });

      if (target[exportedSymbol] !== undefined) {
        lib = target[exportedSymbol];
      } else {
        lib = target.window[exportedSymbol];
      }
    }
  };

  /* eslint-disable func-names, prefer-arrow-callback, new-cap */
  return new Proxy(function () {}, {
    /**
     * Intercept construction on the proxy.
     */
    construct: (target, argumentsList) => {
      load();
      if (lib) {
        return new lib(...argumentsList);
      }
      return null;
    },

    /**
     * Intercept call on the proxy
     */
    apply: (target, thisArg, argumentsList) => {
      load();
      if (lib) {
        return lib.apply(thisArg, argumentsList);
      }
      return null;
    },

    get: (target, prop) => {
      load();
      if (lib) {
        return lib[prop];
      }
      return null;
    },

    set: (target, key, prop) => {
      load();
      if (lib) {
        lib[key] = prop;
        return true;
      }
      return false;
    }
  });
  /* eslint-enable func-names, prefer-arrow-callback, new-cap */
};
