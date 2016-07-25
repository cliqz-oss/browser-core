import Ember from "ember";

export default Ember.Object.extend({
  version: Ember.computed.alias("model.version"),
  topNews: Ember.computed.filterBy("model.news", "personalized", false),
  yourNews: Ember.computed.filterBy("model.news", "personalized", true)
})
