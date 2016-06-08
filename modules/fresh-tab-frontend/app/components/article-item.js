import Ember from 'ember';

export default Ember.Component.extend({
  startEnter: 0,
  elapsed: 0,
  cliqz: Ember.inject.service(),

  click(ev) {
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('target-type'),
      extra: Ember.$(ev.target).attr('extra'),
      target_index: this.get('index')
    });
  },

  mouseEnter(ev) {

    this.set('startEnter', new Date().getTime());
    ev.preventDefault();
    var $target = $(ev.target),
        $description = $target.closest('li').find('.description'),
        $li = $target.closest('li');

      $('.allNews').find('.description').stop().slideUp(200);
      $description.stop().slideDown(500);

  },

  mouseLeave(ev) {
    $('.allNews').find('.description').stop().slideUp(200);
    this.set('elapsed', new Date().getTime() - this.get('startEnter'));
    if(this.get('elapsed') > 2000) {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'hover',
        target_type: this.get('target-type'),
        extra: Ember.$(ev.target).attr('extra'),
        hover_time: this.get('elapsed'),
        target_index: this.get('index')
      });
    }
  }
});
