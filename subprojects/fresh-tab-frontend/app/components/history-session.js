import Ember from 'ember';

export default Ember.Component.extend({
  classNameBindings: ['query:is-active', 'hasOngoingVisits:has-ongoing-visits',
    'isMarkedForDeletion:marked-for-deletion'],

  history: Ember.inject.service('history-sync'),

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

  hasNoSortedVisits: Ember.computed.equal('sortedVisits.length', 0),

  actions: {
    deleteVisit(visit) {
      this.get('history').deleteVisit(visit.get('id'));
    },
    deleteSession() {
      this.$().fadeOut(500, function() {
        this.get('history').deleteSession(this.get('model.id'));
      }.bind(this));
    },
    markForDeletion() {
      this.set("isMarkedForDeletion", true);
    },
    unMarkForDeletion() {
      this.set("isMarkedForDeletion", false);
    },
  }
});
