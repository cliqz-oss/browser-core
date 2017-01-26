import Ember from 'ember';

export default Ember.Component.extend({

  cliqz: Ember.inject.service(),
  notifications: Ember.inject.service(),
  classNames: ['speed-dial'],
  classNameBindings: ['model.hasNewNotifications:new-notifications'],

  actions: {
    click() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: this.get('type'),
        target_index: this.get('index')
      });
    },
    enableNotifications() {
      const model = this.get('model');
      const index = this.get('index')
      this.get('notifications').enableNotifications(model);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'enable_email_notification',
        context: model.get('type'),
        target_index: index
      });
    },

    disableNotifications() {
      const model = this.get('model');
      const index = this.get('index');
      this.get('notifications').disableNotifications(model);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'disable_email_notification',
        context: model.get('type'),
        target_index: index
      });
    },

    refreshNotifications() {
      const model = this.get('model');
      this.get('notifications').refreshNotifications(model);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'refresh_email_notification',
        context: model.get('type'),
        target_index: this.get('index')
      });
    },

    activateNotification() {
      const model = this.get('model');
      this.get('notifications').activateNotification(model);
    },

    remove() {
      const model = this.get('model');
      this.sendAction("removeAction", model);
      if( model.get('notificationsEnabled') || model.get('notificationInaccesible')) {
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
