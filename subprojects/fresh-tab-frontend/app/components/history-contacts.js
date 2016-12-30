import Ember from "ember";
import IscrollList from "../mixins/iscroll-list";
import moment from "moment";

export default Ember.Component.extend(IscrollList, {
  historySync: Ember.inject.service('history-sync'),

  timeSorting: ["lastVisitedAt:desc"],

  length: Ember.computed.alias("model.length"),

  contacts: Ember.computed.map("model", function (model) {
    model.set("componentName", "history-contact");
    return model;
  }),

  activeContacts: Ember.computed.filterBy("contacts", "isActive", true),
  inactiveContacts: Ember.computed.filterBy("contacts", "isActive", false),

  sortedActiveContacts: Ember.computed.sort("activeContacts", "timeSorting"),
  sortedInactiveContacts: Ember.computed.sort("inactiveContacts", "timeSorting"),

  history: Ember.computed.union("inactiveContacts", "separators"),
  sortedHistory: Ember.computed.sort("history", "timeSorting"),

  list: Ember.computed.union("sortedActiveContacts", "sortedHistory"),

  separators: Ember.computed("sortedInactiveContacts.lastObject", function () {
    const separators = [],
      oldestContact = this.get("sortedInactiveContacts.lastObject");

    const yesterday = moment().startOf("day").toDate();

    if (yesterday > oldestContact.get("lastVisitedAt")) {
      separators.push({
        title: "yesterday",
        lastVisitedAt: yesterday,
        componentName: "history-separator"
      });
    }

    return separators;
  }),

  actions: {
    loadMore() {
      this.set('isLoading', true);
      this.get('historySync').loadMore().then( () => {
        this.set('isLoading', false);
      });
    },
  }
});
