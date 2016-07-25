import Ember from "ember";
import IscrollList from "../mixins/iscroll-list";

export default Ember.Component.extend(IscrollList, {
  historySync: Ember.inject.service('history-sync'),

  hasFooter: Ember.computed.bool("model.news.length"),

  nonRootMessages: Ember.computed.filter("model.messages", function (message) {
    return message.get("shortUrl") !== "/";
  }),

  messageSorting: ["isActive:desc", "lastVisitedAt:desc"],
  sortedMessages: Ember.computed.sort("nonRootMessages", "messageSorting"),

  length: Ember.computed.alias("model.messages.length"),

  actions: {

    loadMore() {
      const domain = this.get("model.domain"),
            since = this.get("sortedMessages.lastObject.lastVisitedAt");

      this.set('isLoading', true);
      this.get('historySync').loadMore({ domain, since }).then( () => {
        this.set('isLoading', false);
      });
    },
  }
});
