import background from '../core/base/background';
import Manager from './manager';

export default background({
  init() {
    this.manager = new Manager();
    return this.manager.init();
  },

  unload() {
    if (this.manager) {
      this.manager.unload();
      this.manager = null;
    }
  },
  actions: {
    send(msg) {
      return this.manager.send(msg);
    }
  },
});
