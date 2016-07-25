import Ember from 'ember';

export default Ember.ArrayProxy.extend({
  custom: Ember.computed.filterBy('content', 'custom', true),
  history: Ember.computed.filterBy('content', 'custom', false)
});
