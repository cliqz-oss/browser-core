import Ember from "ember";

export default Ember.Component.extend({
  routing: Ember.inject.service('-routing'),

  classNames: ["item", "history-contact"],
  classNameBindings: [
    "model.isCurrent:is-current-tab",
    "model.isActive:is-active-tab"
  ],

  unreadNews: Ember.computed.filterBy("model.news", "isRead", false),

  click() {
    this.get('routing.router').transitionTo('history-sidebar.domain.index',
        this.get('model'));
  }
});
