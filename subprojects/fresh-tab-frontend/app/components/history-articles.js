import Ember from "ember";
import IscrollList from "../mixins/iscroll-list";

export default Ember.Component.extend(IscrollList, {

  newsSorting: ["publishedAt:desc"],
  sortedNews: Ember.computed.sort("model", "newsSorting")
});
