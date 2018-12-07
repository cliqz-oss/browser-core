/* eslint no-restricted-globals: 'off' */

import { Services } from './globals';
import crypto from './crypto';
import { fetch, Headers } from './fetch';
import TextEncoder from './text-encoder';
import TextDecoder from './text-decoder';
import console from './console';

// Temporal (and hacky) fix for Firefox 62
class FakeWorker {
  constructor(path) {
    const self = this;
    const target = {
      importScripts(scriptPath) {
        Services.scriptloader.loadSubScriptWithOptions(scriptPath, { target, ignoreCache: true });
      },
      postMessage(data) {
        if (self.onmessage) {
          self.onmessage({ data });
        }
      },
      crypto,
      performance: Date,
      fetch,
      Headers,
      TextEncoder,
      TextDecoder,
      atob,
      btoa,
      WebAssembly: typeof WebAssembly !== 'undefined' ? WebAssembly : undefined,
      console,
    };
    target.self = target;
    target.global = target;
    this.target = target;
    Services.scriptloader.loadSubScriptWithOptions(path, { target, ignoreCache: true });
  }

  postMessage(data) {
    this.target.onmessage({ data });
  }

  terminate() {
    delete this.onmessage;
    delete this.target;
  }
}

export default (typeof Worker !== 'undefined' ? Worker : FakeWorker);
