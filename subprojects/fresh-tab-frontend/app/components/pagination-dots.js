import Ember from 'ember';

export default Ember.Component.extend({
  markActiveDot: function () {
    const activeDotNum = this.get('activeDotNum');
    this.$(`.navItem[data-screen=${activeDotNum}]`).addClass("active");
  }.on("didInsertElement"),

  actions: {
    navigateTo(screenId) {
      this.sendAction("navigateToAction", screenId, true)
    }
  }
});
