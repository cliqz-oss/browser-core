import Ember from 'ember';

const getDetails = url => {
  const a = document.createElement('a');
  a.href = url;
  return {
    hostname: a.hostname,
    params: a.search,
    hash: a.hash,
    protocol: a.protocol,
  };
};

const isGoogle = hostname => {
  return /^(www\.)?google(\.[a-z]{2,3}){1,2}$/.test(hostname);
};

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  keyword: Ember.computed('model.url', function () {
    const url = this.get('model.url');
    const details = getDetails(url);

    if (isGoogle(details.hostname)) {
      const searchParams = new URLSearchParams(details.params+details.hash);
      const queries = searchParams.getAll('q');
      return queries[queries.length-1];
    }

    if (this.get('isCliqz')) {
      const searchParams = new URLSearchParams(details.params);
      const queries = searchParams.getAll('q');
      return queries[queries.length-1];
    }
  }),

  isCliqz: Ember.computed('model.url', function () {
    return this.getWithDefault('model.url', '').indexOf('https://cliqz.com/search/?q=') === 0;
  }),

  mouseEnter() {
    this.set('isHovered', true);
  },

  mouseLeave() {
    this.set('isHovered', false);
  },

  actions: {
    open() {
      const url = this.get('model.url');
      const cliqz = this.get('cliqz');
      if (this.get('isCliqz')) {
        cliqz.setUrlbar(this.get('keyword'));
      } else {
        cliqz.openUrl(url);
      }
    }
  }
});
