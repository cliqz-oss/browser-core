import Ember from 'ember';

export default Ember.Component.extend({
  mouseEnter() {
    const historyLink = this.$().parents('.historyLink');
    this.set('title', historyLink.attr('title'));
    historyLink.removeAttr('title');
    },

  mouseLeave() {
    const historyLink = this.$().parents('.historyLink');
    const title = this.get('title')
    historyLink.attr('title', title)
  }
});
