import Ember from "ember";
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { hasMany } from 'ember-data/relationships';

export default Model.extend({
  domain: attr(),
  logo: attr(),
  lastVisitedAt: attr(),
  isCurrent: attr(),
  isActive: attr(),
  tabIndex: attr(),
  snippet: attr(),

  messages: hasMany('history-message'),
  news: hasMany('cliqz-article'),

  rootMessages: Ember.computed.filterBy("messages", "shortUrl", "/"),
  rootMessage: Ember.computed.alias("rootMessages.firstObject"),

  // TODO: move to component
  title: Ember.computed("snippet.og.title", "snippet.title", function () {
    return this.get("snippet.og.title") || this.get("snippet.title");
  }),

  // TODO: move to component
  description: Ember.computed("snippet.og.description", "snippet.desc", function () {
    return this.get("snippet.og.description") || this.get("snippet.desc");
  }),

  image: Ember.computed("snippet.og.image", "rootMessage.image", function () {
    return this.get("snippet.og.image") || this.get("rootMessage.image");
  }),
});
