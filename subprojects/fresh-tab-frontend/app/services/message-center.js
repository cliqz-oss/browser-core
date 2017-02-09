import Ember from 'ember';

export default Ember.Service.extend({
  cliqz: Ember.inject.service('cliqz'),

  init() {
    this._super();
    this.set('messages', Ember.ArrayProxy.create({content: []}));
  },

  hasMessages: Ember.computed.gt('messages.length', 0),

  addMessages(msgs) {
    const messages = this.get('messages');
    msgs && Object.keys(msgs).forEach(messageId => {

      const message = msgs[messageId];
      if (this.container.registry.has(`template:components/messages/${message.template}-message`)) {
        messages.addObject(Ember.Object.create(message));
      }

      this.get('cliqz').sendTelemetry({
        type: 'notification',
        topic: messageId,
        context: 'home',
        action: 'show'
      });
    });
  },

  remove(id) {
    this.set('messages.content', this.get('messages').rejectBy('id', id));
  },
});
