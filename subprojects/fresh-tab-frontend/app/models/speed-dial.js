import Ember from 'ember';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
  type: attr(),
  url: attr(),
  displayTitle: attr(),
  title: attr(),
  logo: attr(),
  notificationCount: attr(),
  hasNewNotifications: attr(),
  notificationStatus: attr(),
  notificationError: attr(),
  custom: attr(),
  searchAlias: attr(),
  notificationsAvailable: Ember.computed.equal('notificationStatus', 'available'),
  notificationsEnabled: Ember.computed.equal('notificationStatus', 'enabled'),
  canBeActivated: Ember.computed.equal('notificationError', 'no-data'),
  notificationInaccesible: Ember.computed.equal('notificationError', 'cannot-fetch-count')
});
