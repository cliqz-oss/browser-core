import Ember from 'ember';

export default Ember.Component.extend({
  classNameBindings: ['query:is-active', 'hasOngoingVisits:has-ongoing-visits'],

  visitsSorting: ['lastVisitedAt:asc'],
  visits: Ember.computed.sort('model.visits', 'visitsSorting'),

  entryVisit: Ember.computed.alias('visits.firstObject'),

  sortedVisits: Ember.computed('visits', function () {
    const visits = this.get('visits');
    return visits.slice(1, visits.length);
  }),

  ongoingVisits: Ember.computed.filter('visits', function (visit) {
    return typeof visit.get('tabIndex') === "number";
  }),

  hasOngoingVisits: Ember.computed.gt('ongoingVisits.length', 0),

});
