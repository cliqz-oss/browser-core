import checkIfChromeReady from '../core/content/ready-promise';
import createModuleWrapper from '../core/helpers/action-module-wrapper';

class Cliqz {
  constructor() {
    this.history = createModuleWrapper('history');
    this.core = createModuleWrapper('core');

    checkIfChromeReady().catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Chrome was never ready', ex);
    });
  }
}

export default new Cliqz();
