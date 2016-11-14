import Ember from 'ember';

export default Ember.Route.extend({
  cliqz: Ember.inject.service('cliqz'),

  model() {
    return this.get('cliqz').getCliqzStatus();
  },

  actions: {
    restart() {
      const cliqz = this.get('cliqz');
      cliqz.restart();
      setTimeout(() => {
        window.location.reload()
      }, 3000);
    },
    toggleModule(module) {
      const cliqz = this.get('cliqz');
      let promise;

      if (module.isEnabled) {
        promise = cliqz.disableModule(module.name);
      } else {
        promise = cliqz.enableModule(module.name);
      }

      promise.then(() => {
        window.location.reload()
      });
    }
  }
});
