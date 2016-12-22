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

    alwaysShare() {
      this.get('cliqz').shareLocation('yes');
      this.get('messageCenter').remove(this.get('model.id'));
    },

    neverAsk() {
      this.get('cliqz').shareLocation('no');
      this.get('messageCenter').remove(this.get('model.id'));
    },

    openLocationPage(url) {
      this.get('cliqz').sendTelemetry({
        type: 'notification',
        topic: 'share_location',
        context: 'home',
        action: 'click',
        target: 'learn_more'
      });
      window.open(url,'_blank');
    },

    logoClick() {
      this.get('cliqz').sendTelemetry({
        type: 'notification',
        topic: 'share_location',
        context: 'home',
        action: 'click',
        target: 'logo'
      });
    },

    notificationClick() {
      this.get('cliqz').sendTelemetry({
        type: 'notification',
        topic: 'share_location',
        context: 'home',
        action: 'click',
        target: 'body'
      });
    }
  }
});
