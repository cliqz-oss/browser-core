import Ember from 'ember';

const SPECIAL_KEYS = [8, 9, 13, 16, 17, 18, 19, 20, 27,
                      33, 34, 35, 36, 37, 38, 39, 40, 91, 224];

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),
  keyDown(ev) {
    let input = SPECIAL_KEYS.indexOf(ev.which) > -1 ? '' : ev.key;
    if (ev.keyCode === 13) {
      input = Ember.$(ev.target).val();
    }
    this.get('cliqz').setUrlbar(input);
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'search_keystroke'
    });
    Ember.run.later( () => {
      this.$('input').val("")
    })
  },

  autofocus: function () {
    this.$('input').focus();
  }.on('didInsertElement'),

  actions: {
    focus() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'search_focus'
      });
    },
    blur() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'search_blur'
      });
    },
  }
});
