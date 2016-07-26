import { getSmartCliqz } from 'smart-cliqz-cache/rich-header'
import { utils } from 'core/cliqz';
import Cache from 'smart-cliqz-cache/cache';

const HOUR = 1000 * 60 * 60;
const DAY = 24 * HOUR;

export default class extends Cache {
  constructor(file = 'cliqz/smartcliqz-trigger-urls-cache.json') {
    super(false);
    this.file = file;
  }

  init() {
    this.load();
    this.scheduleRecurringClean();
  }

  load() {
    return super.load(this.file);
  }
  save() {
    return super.save(this.file);
  }

  scheduleRecurringClean(delay) {
    if (!delay) {
      const lastCleanTime = utils.getPref('smart-cliqz-last-clean-ts');
      if (!lastCleanTime) {
        delay = 0;
      } else {
        const timeSinceLastClean = Date.now() - (new Date(Number(lastCleanTime)));
        delay = timeSinceLastClean > DAY ? 0 : DAY - timeSinceLastClean;
      }
    }

    this.cleanTimeout = utils.setTimeout(_ => {
      this.clean().then(_ => {
        utils.setPref('smart-cliqz-last-clean-ts', Date.now().toString());
        this.scheduleRecurringClean(DAY);
      });
    }, delay);
    utils.log(`scheduled SmartCliqz trigger URLs cleaning in ${Math.round(delay / 1000 / 60)} minutes`);
  }

  // clean trigger URLs that are no longer valid
  clean(delay = 1000) {
    return new Promise((resolve, reject) => {
      utils.log('start cleaning SmartCliqz trigger URLs');

      const cleaners = Object.keys(this._cache).map((url, idx) => () => {
        const id = this.retrieve(url);
        return new Promise((resolve, reject) => {
          utils.setTimeout(() => {
            if (this.isUnloaded) {
              reject('unloaded');
              return;
            }
            getSmartCliqz(id).then((smartCliqz) => {
              if (!smartCliqz.data.trigger_urls.some(u => u === url)) {
                utils.log(`unknown trigger URL: deleting SmartCliqz ${id}`);
                this.delete(url);
                this.save();
              }
              resolve();
            }).catch((e) => {
              if (e.type && e.type === 'ID_NOT_FOUND') {
                utils.log(`unkown ID: deleting SmartCliqz ${id}`);
                this.delete(url);
                this.save();
              }
              resolve();
            });
          }, idx * delay);
        });
      });
      // final action: resolve
      cleaners.push(() => {
        utils.log('done cleaning SmartCliqz trigger URLs')
        resolve();
        return Promise.resolve();
      });;
      // execute sequentually
      cleaners.reduce((current, next) =>
        current.then(_ => next(), e => { reject(e); return Promise.reject(); }), Promise.resolve());
    });
  }

  unload() {
    this.isUnloaded = true;
    utils.clearTimeout(this.cleanTimeout);
  }
}
