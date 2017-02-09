import Ember from 'ember';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { belongsTo } from 'ember-data/relationships';

export default Model.extend({
  url: attr(),
  title: attr(),
  query: attr(),
  isActive: attr(),
  isCurrent: attr(),
  tabIndex: attr(),
  lastVisitedAt: attr(),
  meta: attr(),

  contact: belongsTo('history-contact'),
  session: belongsTo('session'),

  shortUrl: Ember.computed("url", function () {
    const url = this.get("url");
    const reUrlPath = /(^http.?:\/\/)(.*?)([\/\\\\?]{1,})(.*)/;
    return (url.match(reUrlPath) || []).pop() || "/";
  }),

  smartTitle: Ember.computed("title", "meta.ogTitle", "meta.title", function () {
    return this.get("meta.ogTitle") || this.get("meta.title") || this.get("title");
  }),

  description: Ember.computed("meta.ogDescription", "meta.description", function () {
    return this.get("meta.ogDescription") || this.get("meta.description");
  }),

  image: Ember.computed.alias("meta.ogImage")
});
