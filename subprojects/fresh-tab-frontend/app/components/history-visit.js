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
  tagName: 'a',

  attributeBindings: ['href', 'title'],

  cliqz: Ember.inject.service(),
  classNames: ['visit'],
  classNameBindings: ['isMarkedForDeletion:marked-for-deletion'],

  href: Ember.computed.alias('model.url'),
  title: Ember.computed.alias('model.title'),

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
    return this.getWithDefault('model.url', '').indexOf('https://cliqz.com/search?q=') === 0;
  }),

  mouseEnter() {
    this.set('isHovered', true);
  },

  mouseLeave() {
    this.set('isHovered', false);
  },

  click(e) {
    e.preventDefault();
    e.stopPropagation();
    this.actions.open.call(this);
  },

  setup: function() {
    this.set("isMarkedForDeletion", false);
    if (this.$()) {
      this.$().css('display', 'block');
    }
  }.on('didUpdateAttrs'),

  actions: {
    open() {
      const url = this.get('model.url');
      const cliqz = this.get('cliqz');
      if (this.get('isCliqz')) {
        cliqz.queryCliqz(this.get('keyword'));
      } else {
        cliqz.openUrl(url, true);
      }
      if(!this.get('isOtherTelemetrySignalSent')) { // To not sending duplicate signals
        this.get('cliqz').sendTelemetry({
          type: 'history',
          view: 'sections',
          action: 'click',
          target: this.get('logoclass') === 'big' ? 'header' : 'site'
        });
      }
      this.set('isOtherTelemetrySignalSent', false);
    },
    deleteVisit() {
      const model = this.get('model');
      this.$().fadeOut(function () {
        this.get('onDelete')(model);
      }.bind(this));
    },
    markForDeletion() {
      this.set("isMarkedForDeletion", true);
    },
    unMarkForDeletion() {
      this.set("isMarkedForDeletion", false);
    },
    sendTelemetry(name) {
      this.get('cliqz').sendTelemetry({
        type: 'history',
        view: 'sections',
        action: 'click',
        target: this.get('logoclass') === 'big' ? 'header' : 'site',
        element: name
      });
      this.set('isOtherTelemetrySignalSent', true);
    }
  }
});
