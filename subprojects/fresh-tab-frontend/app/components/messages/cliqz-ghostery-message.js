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

    openGhosteryPage(url) {
      const messageId = this.get('model.id');
      this.get('cliqz').dismissMessage(messageId);

      this.get('cliqz').sendTelemetry({
        type: 'notification',
        topic: 'cliqz-ghostery',
        context: 'home',
        action: 'click',
        target: 'learn_more'
      });
      window.open(url,'_blank');
    },

    logoClick() {
      this.get('cliqz').sendTelemetry({
        type: 'notification',
        topic: 'cliqz-ghostery',
        context: 'home',
        action: 'click',
        target: 'logo'
      });
    },

    notificationClick() {
      this.get('cliqz').sendTelemetry({
        type: 'notification',
        topic: 'cliqz-ghostery',
        context: 'home',
        action: 'click',
        target: 'body'
      });
    }
  }

});
