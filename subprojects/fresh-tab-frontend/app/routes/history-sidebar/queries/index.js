import Ember from "ember";

export default Ember.Route.extend({
  cliqz: Ember.inject.service(),

  model() {
    return this.get("cliqz").getQueries().then(q => {
      return q;
    });
  },

});
