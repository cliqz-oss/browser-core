import Ember from "ember";
import IscrollList from "../mixins/iscroll-list";

export default Ember.Component.extend(IscrollList, {
  length: Ember.computed.alias("model.length"),


  timeSorting: ["lastQueriedAt:desc"],

  sortedQueries: Ember.computed.sort("model", "timeSorting"),
});
