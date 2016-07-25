import Ember from 'ember';

export default Ember.Mixin.create({
  cliqz: Ember.inject.service(),

  actions: {
    open() {
      const tabIndex = this.get("model.tabIndex"),
        cliqz = this.get("cliqz");
      if (tabIndex) {
        cliqz.selectTabAtIndex(tabIndex);
      } else {
        cliqz.openUrl(this.get("url"));
      }
    }
  }
});
