import Ember from "ember";

export default Ember.Component.extend({
  classNames: ["list", "card"],

  cliqz: Ember.inject.service(),

  click() {
    this.set("model.isRead", true);
    this.get("cliqz").openUrl(this.get("model.url"));
  }
});
