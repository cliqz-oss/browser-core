import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),
  tagName: 'from',
  classNames: ['search'],

  classNameBindings: ['hasQuery:is-active'],

  hasQuery: Ember.computed.gt('model.length', 0),

  modelObserver: function() {
    Ember.run.debounce(() => {
      this.set('model', this.get('modelProxy'));
      this.actions.sendTelemetry.call(this);
    }, this.get('debounce'));
  }.observes('modelProxy'),

  modelProxy: function(key, value) {
    if (arguments.length > 1) {
      return this._modelProxy = value;
    } else {
      return this.getWithDefault('model', this._modelProxy);
    }
  }.property('model'),

  clear() {
    this.set('modelProxy', '');
  },

  keyUp(e) {
    if (e.key === "Escape") {
      this.clear();
    }
  },

  actions: {
    clearQuery() {
      if (this.get('hasQuery')) {
        this.get('cliqz').sendTelemetry({
          type: 'history',
          view: 'sections',
          action: 'click',
          target: 'clear_search'
        });
      }
      this.clear();
    },
    sendTelemetry() {
      // TODO: @mai check why query length is equal 1 when there are two letters in the search box
      if (this.get('hasQuery')) {
        this.get('cliqz').sendTelemetry({
          type: 'history',
          view: 'sections',
          action: 'search',
          query_length: this.get('model.length')
        });
      }
    }
  }
});
