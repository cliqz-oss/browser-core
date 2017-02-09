import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType,
});

Router.map(function() {
  this.route('freshtab', { path: '/' }, function () {
    this.route('history', function () {
    });
  });
  this.route('preferences', function () {
  });
  this.route('history-sidebar', function () {
    this.route('queries', function () {
      this.route('query', { path: ':query' });
    });
    this.route('domain', { path: ':domain' }, function () {
      this.route('query', { path: ':query' });
      this.route('news');
    });
  });
});

export default Router;
