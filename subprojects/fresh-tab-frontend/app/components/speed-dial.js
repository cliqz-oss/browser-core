import Ember from 'ember';

export default Ember.Component.extend({

  cliqz: Ember.inject.service(),
  notifications: Ember.inject.service(),

  classNames: ['speed-dial'],
  classNameBindings: ['model.hasNewNotifications:new-notifications'],

  click() {
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('type'),
      target_index: this.get('index')
    });
  },

  actions: {
    enableNotifications() {
      const model = this.get('model');
      this.get('notifications').enableNotifications(model);
    },

    disableNotifications() {
      const model = this.get('model');
      this.get('notifications').disableNotifications(model);
    },

    activateNotification() {
      const model = this.get('model');
      this.get('notifications').activateNotification(model);
    },

    remove() {
      const model = this.get('model');
      this.sendAction("removeAction", model);
      if( model.get('notificationsEnabled')) {
        this.get('notifications').disableNotifications(model);
      }
    },

    resetAll() {
      this.sendAction("resetAllAction");
    },

    searchAlias() {
      this.get('cliqz').setUrlbar('');
      this.get('cliqz').setUrlbar(this.get('alias') + ' ');
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: this.get('type') + '_search',
        target_index: this.get('index')
      });
      return false;
    }
  }
});
