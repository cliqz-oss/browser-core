import Ember from 'ember';

export default Ember.Component.extend({
  startEnter: 0,
  elapsed: 0,
  cliqz: Ember.inject.service(),

  calculateHeight: function() {
    var height = this.$(".article-content").height();
    this.sendAction("calculateHeightAction", height);
  }.on('didInsertElement'),

  click(ev) {
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('model.type'),
      extra: Ember.$(ev.target).attr('extra'),
      target_index: this.get('index')
    });
  },

  adjustHeight: function () {
    let height = this.get("height");
    if(height) {
      this.$(".article-content").css("min-height", height);
    }
  }.observes("height").on("didRender"),

  mouseEnter() {
    this.set('startEnter', Date.now());
  },

  mouseLeave(ev) {
    const elapsed = Date.now() - this.get('startEnter');
    this.set('startEnter', 0);
    if(elapsed > 2000) {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'hover',
        target_type: this.get('target-type'),
        extra: Ember.$(ev.target).attr('extra'),
        hover_time: elapsed,
        target_index: this.get('index')
      });
    }
  }
});
