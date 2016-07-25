import Ember from "ember";

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),
  routing: Ember.inject.service("-routing"),

  actions: {
    redoQuery() {
      this.get("cliqz").redoQuery(this.get("model.query"));
      this.get("routing.router").transitionTo("history-sidebar.index");
    }
  }
});
