import Ember from "ember";

export default Ember.Route.extend({
  cliqz: Ember.inject.service(),
  historySync: Ember.inject.service('history-sync'),

  deactivate() {
    return this.get('historySync').stop();
  },

  beforeModel() {
    return this.get('historySync').start();
  },

  model() {
    return Ember.RSVP.hash({
      contacts: this.store.peekAll("history-contact"),
      queries: this.get("cliqz").getQueries(),
    });
  },

  actions: {
    newTab() {
      this.get("cliqz").openNewTab();
    },

    openContact(contact) {
      this.transitionTo("history-sidebar.domain", contact);
    }
  }
});
