import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  messageCenter: Ember.inject.service('message-center'),

  actions: {
    dismiss() {
      const messageId = this.get('model.id');
      this.get('cliqz').dismissMessage(messageId);
      this.get('messageCenter').remove(messageId);
    },
    openSupportPage(url) {
      const messageId = this.get('model.id');
      this.get('cliqz').dismissMessage(messageId);

      this.get('cliqz').sendTelemetry({
        type: 'notification',
        topic: 'windows-xp-vista-end-of-support',
        context: 'home',
        action: 'click',
        target: 'learn_more'
      });
      window.open(url,'_blank');
    },
  }
});
