import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  messageCenter: Ember.inject.service('message-center'),

  actions: {
    dismiss() {
      const messageId = this.get('model.id');
      this.get('cliqz').dismissMessage(messageId);
      this.get('messageCenter').remove(messageId);
    }
  }
});
