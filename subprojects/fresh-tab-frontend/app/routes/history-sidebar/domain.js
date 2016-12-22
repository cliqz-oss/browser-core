import Ember from "ember";

export default Ember.Route.extend({
  historySync: Ember.inject.service('history-sync'),

  model(params) {
    const contact = this.store.peekRecord("history-contact", params.domain);
    if (contact) {
      return contact;
    } else {
      return this.get("historySync").loadMore({ domain: params.domain, since: new Date() }).then( () => {
        return this.store.peekRecord("history-contact", params.domain);
      });
    }
  }

});
