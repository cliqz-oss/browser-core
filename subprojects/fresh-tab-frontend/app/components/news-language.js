import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),
  newsLanguage: Ember.computed('model', function() {
    const model = this.get('model');
    return model.get('newsLanguage');

  }),
  actions: {
    selectLanguage(language) {
      this.get('cliqz').setNewsLanguage(language);
      this.get('cliqz').sendTelemetry({
        type: 'home_settings',
        action: 'click',
        target: 'top_news_language',
        state: language
      });
    }
  }
});
