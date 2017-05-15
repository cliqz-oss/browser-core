import Ember from 'ember';

export default Ember.Component.extend({
  tagName: 'ul',
  classNames: ['session-list'],

  sessionsSorting: ['lastVisitedAt:desc'],
  sortedSessions: Ember.computed.sort('model', 'sessionsSorting'),
  sessions: Ember.computed.filterBy('sortedSessions', 'isDeleted', false),

  setScrollEvent: function () {
    this.__scroll = this.scroll.bind(this);
    this.$().on('scroll', this.__scroll);
  }.on('didInsertElement'),

  unsetScrollEvent: function () {
    this.$().off('scroll', this.__scroll);
  }.on('willDestroyElement'),

  scroll: function () {
    if ((this.element.scrollTop + 200) >= this.element.scrollTopMax) {
      Ember.run.once(this, this.loadMore);
    }
  },

  autoLoadMore: function () {
    if (this.get('model.hasMoreResults') && (this.element.scrollTopMax === 0)) {
      Ember.run.once(this, this.loadMore);
    }
  }.observes('model.content.length', 'model.hasMoreResults'),

  loadMore() {
    this.get('model').loadMore();
  },

  actions: {
    loadMore() {
      this.loadMore();
    }
  },
});
