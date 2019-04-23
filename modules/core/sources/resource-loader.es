import config from './config';
import Logger from './logger';
import prefs from './prefs';
import { fetch } from './http';
import Storage from '../platform/resource-loader-storage';
import { fromUTF8 } from '../core/encoding';
import { inflate, deflate } from './zlib';
import { isWebExtension, platformName, isMobile } from '../core/platform';

const logger = Logger.get('core', {
  level: 'log',
  prefix: '[resource-loader]',
});

// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;

async function get(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.text();
}

/* Abstract away the pattern `onUpdate` trigger list of
 * callbacks. This pattern is used a lot, so it looks worth
 * it to create a base class to handle it.
 */
export class UpdateCallbackHandler {
  constructor() {
    this.callbacks = [];
  }

  onUpdate(callback) {
    this.callbacks.push(callback);
  }

  triggerCallbacks(args) {
    return Promise.all(this.callbacks.map(cb => cb(args)));
  }
}

/* A resource is responsible for handling a remote resource persisted on
 * disk. It will be persisted on disk upon each update from remote. It is
 * also able to parse JSON automatically if `dataType` is 'json'.
 */
export class Resource {
  constructor(name, options = {}) {
    this.name = (typeof name === 'string') ? [name] : name;
    this.remoteURL = options.remoteURL;
    this.dataType = options.dataType || 'json';
    this.filePath = ['cliqz', ...this.name];
    this.chromeURL = options.chromeURL || `${config.baseURL}${this.name.join('/')}`;
    this.storage = new Storage(this.filePath);
    this.remoteOnly = options.remoteOnly || platformName === 'mobile';
    this.compress = options.compress || (isMobile ? false : isWebExtension);
    this.size = 0;
  }

  /**
   * Loads the resource. Load either a cached version of the file available in
   * the profile, or at the chrome URL (if provided) or from remote.
   *
   * @returns a Promise resolving to the resource. This Promise can fail on
   * error (if the remote resource cannot be fetched, or if the parsing
   * fails, for example), thus **you should should add a _catch_** to this
   * promise to handle errors properly.
   */
  load() {
    return this.storage.load()
      .then(data => this.decompressData(data))
      .then((data) => {
        if (this.dataType === 'binary') {
          // binary data comes from decompression as a Uint8Array
          return data.buffer || data;
        }
        try {
          // data might be a plain string in web extension case
          // for react native the TextDecoder.decode returns an empty string
          return fromUTF8(data) || data;
        } catch (e) {
          return data;
        }
      })
      .then(data => this.parseData(data))
      .catch(() => {
        if (this.remoteOnly) {
          return Promise.reject(new Error('Should update only from remote'));
        }
        return this.updateFromURL(this.chromeURL);
      })
      .catch(() => this.updateFromRemote());
  }

  /**
   * Tries to update the resource from the `remoteURL`.
   *
   * @returns a Promise resolving to the updated resource. Similarly
   * to the `load` method, the promise can fail, and thus you should
   * had a **catch** close to your promise to handle any exception.
   */
  updateFromRemote() {
    if (this.remoteURL === undefined) {
      return Promise.reject(new Error('updateFromRemote: remoteURL is undefined'));
    }
    return this.updateFromURL(this.remoteURL);
  }

  /* *****************************************************************
   * Private API
   ***************************************************************** */

  updateFromURL(url) {
    if (url) {
      return get(url)
        .then(this.persist.bind(this));
    }

    return Promise.reject(new Error('updateFromURL: url is undefined'));
  }

  compressData(data) {
    if (this.compress) {
      return deflate(data, { to: this.dataType !== 'binary' ? 'string' : undefined });
    }
    return data;
  }

  decompressData(data) {
    if (this.compress) {
      try {
        return inflate(data, { to: this.dataType !== 'binary' ? 'string' : undefined });
      } catch (e) {
        return data;
      }
    } else {
      return data;
    }
  }

  persist(data) {
    return this.parseData(data).then((parsed) => {
      const saveData = this.compressData(data);
      return this.storage.save(saveData)
        .catch(e => logger.error('Failed to persist:', e))
        .then(() => parsed);
    });
  }

  parseData(data) {
    this.size = data.length;

    if (this.dataType === 'json') {
      try {
        const parsed = JSON.parse(data);
        return Promise.resolve(parsed);
      } catch (e) {
        return Promise.reject(new Error(`parseData: failed with exception ${e} ${data}`));
      }
    }

    return Promise.resolve(data);
  }
}


export default class ResourceLoader extends UpdateCallbackHandler {
  static loaders = [];

  static report() {
    return this.loaders.reduce((report, loader) => ({
      ...report,
      [loader.resource.name]: loader.report(),
    }), {});
  }

  constructor(resourceName, options = {}) {
    super();

    this.resource = new Resource(resourceName, options);
    this.cron = options.cron || ONE_HOUR;
    this.updateInterval = options.updateInterval || 10 * ONE_MINUTE;
    this.intervalTimer = null;

    this.constructor.loaders.push(this);
  }

  report() {
    return {
      size: this.resource.size,
      updateInterval: this.updateInterval,
      cron: this.cron,
      remoteURL: this.resource.remoteURL,
      compress: this.resource.compress,
    };
  }

  init() {
    if (!this.intervalTimer && this.resource.remoteURL) {
      this.intervalTimer = setInterval(
        this.updateFromRemote.bind(this),
        this.updateInterval
      );
    }
  }

  /**
   * Loads the resource hold by `this.resource`. This can return
   * a failed promise. Please read `Resource.load` doc string for
   * further information.
   */
  load() {
    this.init();
    return this.resource.load();
  }

  /**
   * Updates the resource from remote (maximum one time per `cron`
   * time frame).
   *
   * @returns a Promise which never fails, since this update will be
   * triggered by `setInterval` and thus you cannot catch. If the update
   * fails, then the callback won't be called.
   */
  /* eslint-disable consistent-return */
  async updateFromRemote({ force = false } = {}) {
    const path = this.resource.name.join('/');
    const pref = `resource-loader.lastUpdates.${path}`;
    const lastUpdate = Number(prefs.get(pref, 0));
    const currentTime = Date.now();

    if (force || currentTime > this.cron + lastUpdate) {
      let data;
      try {
        data = await this.resource.updateFromRemote();
        prefs.set(pref, String(Date.now()));
      } catch (e) {
        logger.warn(`Failed to fetch resources for ${path} from remoteUrl: ${this.resource.remoteURL}`, e);
        return;
      }
      try {
        await this.triggerCallbacks(data);

        // For now, leave the old semantic unchanged, and
        // return a value to avoid breakage with existing code.
        //
        // Better: The caller should only use the value
        // from the callback, as relying on the return value
        // is dangerous. The caller cannot reliably know whether
        // it will receive the value or undefined.
        return data;
      } catch (e) {
        logger.error(`Failed to execute callbacks for ${path}`, e);
      }
    }
  }

  stop() {
    clearInterval(this.intervalTimer);
  }
}
