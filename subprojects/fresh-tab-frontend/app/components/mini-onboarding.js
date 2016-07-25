import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),
  actions: {
    freshTabLearnMore(url) {
      this.sendAction("freshTabLearnMoreAction", url)
    },
    revertBack() {
      this.sendAction("revertBackAction");
    }
  }
});
