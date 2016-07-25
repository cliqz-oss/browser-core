import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { belongsTo } from 'ember-data/relationships';

export default Model.extend({
  publishedAt: attr(),
  url: attr(),
  score: attr(),
  imageUrl: attr(),
  title: attr(),
  description: attr(),
  isRead: attr(),

  contact: belongsTo('history-contact'),
});
