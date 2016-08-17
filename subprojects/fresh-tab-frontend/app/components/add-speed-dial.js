import Ember from 'ember';
import SpeedDial from '../models/speed-dial';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  isHidden: Ember.computed.not("isVisible"),

  classNameBindings: ['isHidden:hidden'],

  observeNewSpeedDial: Ember.observer("newSpeedDial", function () {
    const url = this.get("newSpeedDial"),
        re = /^((https?:\/\/.*)|((https?:\/)|(https?:)|(https?)|(htt)|(ht)|(h?))$)/;
    if(!re.test(url)) {
      this.set("newSpeedDial", "http://" + url);
    }
  }),

  reset: function () {
    this.set('error', false);
    this.set("newSpeedDial", '');
  }.on('didInsertElement'),

  actions: {
    save() {
      const url = this.get("newSpeedDial") && this.get('newSpeedDial').trim();
      if(!url) {
        return;
      }
      const speedDial = SpeedDial.create({
        url,
        cliqz: this.get("cliqz")
      });
      speedDial.save().then(() => {
        this.reset();
        this.toggleProperty('showForm');
        this.sendAction("addToCustomAction", speedDial);
      }, () => {
        this.set('error', true);
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
