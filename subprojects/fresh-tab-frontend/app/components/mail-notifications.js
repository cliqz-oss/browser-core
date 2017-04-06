import Ember from 'ember'

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),
  store: Ember.inject.service(),
  notifications: Ember.inject.service(),

  isActive: Ember.computed(function() {
    const model = this.get('model');
    return model.get('hasActiveNotifications')
  }),

  actions: {
    toggle() {
      const isActive = this.get('isActive');
      const store = this.get('store');
      let gmail = store.peekRecord('speed-dial', 'mail.google.com');
      if(isActive) {
        this.get('notifications').disableNotifications(gmail);
      } else {
        this.get('notifications').enableNotifications(gmail);
      }
      this.toggleProperty('isActive');
      this.get('cliqz').sendTelemetry({
        type: 'home_settings',
        action: 'click',
        target: 'email_notifications',
        state: this.get('isActive') ? 'on' : 'off'
      });
    }
  }
});
