import Ember from 'ember';
import DS from 'ember-data';
import { hasMany } from 'ember-data/relationships';

export default DS.Model.extend({

  visits: hasMany('history-message'),

  visitsSorting: ['lastVisitedAt:asc'],

  sortedVisits: Ember.computed.sort('visits', 'visitsSorting'),

  firstVisit: Ember.computed.alias('sortedVisits.firstObject'),
  lastVisit: Ember.computed.alias('sortedVisits.lastObject'),

  logo: Ember.computed.alias('firstVisit.contact.logo'),

  domain: Ember.computed.alias('firstVisit.contact.domain'),

  lastVisitedAt: Ember.computed.alias('lastVisit.lastVisitedAt'),


});
