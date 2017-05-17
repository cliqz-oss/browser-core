import Ember from 'ember';

export default Ember.Component.extend({
  tagName: 'from',
  classNames: ['search'],

  classNameBindings: ['hasQuery:is-active'],

  hasQuery: Ember.computed.gt('model.length', 0),

  modelObserver: function() {
    Ember.run.debounce(() => {
      this.set('model', this.get('modelProxy'));
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
    this.set('modelProxy', '')
  },

  keyUp(e) {
    if (e.key === "Escape") {
      this.clear();
    }
  },

  actions: {

    clearQuery() {
      this.clear();
    }

  }
});
