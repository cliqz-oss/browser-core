import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  displayAddBtn: Ember.computed('model.custom', function() {
    return this.getWithDefault('model.custom.length', 0) < 5;
  }),

  topFiveHistory: Ember.computed('model.history', function() {
    return this.get('model.history').slice(0, 5)
  }),

  observeNewSpeedDial: Ember.observer("newSpeedDial", function () {
    var url = this.get("newSpeedDial"),
        re = /^((https?:\/\/.*)|((https?:\/)|(https?:)|(https?)|(htt)|(ht)|(h?))$)/;
      if(!re.test(url)) {
        this.set("newSpeedDial", "http://" + url);
      }
  }),

  actions: {
    remove(speedDial) {
      this.get("model").removeObject(speedDial);
      this.get('cliqz').removeSpeedDial(speedDial);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'remove-' + arguments[1].slice(0, -1),
        target_index: arguments[2]
      });
    },
    addSpeedDial() {
      var url = this.get('newSpeedDial') && this.get('newSpeedDial').trim(),
          self = this;
      if (!url) { return; }

      this.get('cliqz').addSpeedDial(url).then((obj) => {
        if('error' in obj) {
          this.set('showNotification', true);
          return;
        } else {
          self.get("model").pushObject(obj);
          self.set('newSpeedDial', '');
          self.set('showAddForm', false);
          self.set('hideAddBtn', false);

          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'click',
            target_type: 'add-customsite'
          });
        }
      });
    },

    showAddForm() {
      this.toggleProperty('hideAddBtn');
      this.toggleProperty('showAddForm');
      setTimeout(function() {
        Ember.$('.addUrl').focus();
      }, 300);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'show-customsites-add-form'
      });
    },

    hideAddForm() {
      this.toggleProperty('hideAddBtn');
      this.toggleProperty('showAddForm');
      this.set('newSpeedDial', '');
      this.set('showNotification', false);
      this.set('notValidUrl', false);

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'hide-customsites-add-form'
      });
    }
  }
});
