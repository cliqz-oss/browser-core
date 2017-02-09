import Ember from "ember";

const VisitsProxy = Ember.ArrayProxy.extend({
  setup: function () {
    this.setProperties({
      isLoading: false,
      hasMoreResults: true,
      content: [],
    });
  }.on('init'),

  load() {
    return this.__load({ query: this.get('query'), from: this.get('from'), to: this.get('to') });
  },

  loadMore() {
    if (this.get('isLoading') || !this.get('hasMoreResults')) {
      return;
    }
    return this.__load({ query: this.get('query'), to: this.get('currentFrom') });
  },

  __load({ query, from, to }) {
    const history = this.get('history');
    this.set('isLoading', true);

    return history.search(query, from, to).then(({sessions, history}) => {
      this.setProperties({
        hasMoreResults: history.urlCount !== 0,
        isLoading: false,
        currentFrom: history.frameStartsAt,
      });
      this.get('content').addObjects(sessions);
    });
  },
});

export default Ember.Route.extend({
  historySync: Ember.inject.service('history-sync'),

  queryParams: {
    query: {
      refreshModel: true,
    },
    from: {
      refreshModel: true,
    },
    to: {
      refreshModel: true,
    }
  },

  beforeModel() {
    document.title = "History"
  },

  model({ query, from, to }) {
    const history = this.get('historySync');
    const model = VisitsProxy.create({
      history,
      query,
      from,
      to,
    });
    model.load();
    return model;
  },

});

