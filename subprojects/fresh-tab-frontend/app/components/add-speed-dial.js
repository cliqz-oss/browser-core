import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),
  store: Ember.inject.service(),
  notifications: Ember.inject.service('notifications'),

  tagName: 'li',

  classNames: 'add-speed-dial',

  classNameBindings: ['showFrom:addDialBox:addFrame'],

  reset: function () {
    this.set('error-duplicate', false);
    this.set('error-invalid', false);
    this.set("newSpeedDial", '');
  }.on('didInsertElement'),

  actions: {
    save() {
      const url = this.get("newSpeedDial") && this.get('newSpeedDial').trim().replace(/\s/g,'');
      const notifications = this.get('notifications');

      if(!url) {
        return;
      }
      const speedDial = this.get('store').createRecord('speed-dial', {
        url,
        cliqz: this.get("cliqz")
      });
      speedDial.save().then(() => {
        this.reset();
        this.toggleProperty('showForm');
        this.sendAction("addToCustomAction", speedDial);
        notifications.getNotifications();
      }, (e) => {
        if (e === 'duplicate') {
          this.set('error-duplicate', true);
        } else {
          this.set('error-invalid', true);
        }
      });
    },
    show() {
      //this.actions.closeUndo.call(this);
      this.toggleProperty('showForm');

      setTimeout(function() {
        Ember.$('.addUrl').focus();
      }, 300);

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'show-customsites-add-form'
      });
    },

    hide() {
      this.toggleProperty('showForm');

      this.reset();

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'hide-customsites-add-form'
      });
    }
  }
});
