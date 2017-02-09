import Ember from 'ember';
import moment from 'moment';

export default Ember.Controller.extend({
  queryParams: ['query', 'from', 'to'],

  timestamps: Ember.computed(function () {
    const now = moment();
    const yesterday = moment().subtract(1, 'day');
    const lastWeek = moment().subtract(1, 'week');

    return Ember.Object.create({
      today: {
        from: now.startOf('day').valueOf() * 1000,
        to: now.endOf('day').valueOf() * 1000,
      },
      yesterday: {
        from: yesterday.startOf('day').valueOf() * 1000,
        to: yesterday.endOf('day').valueOf() * 1000,
      },
      lastWeek: {
        from: lastWeek.startOf('day').valueOf() * 1000,
        to: now.endOf('day').valueOf() * 1000,
      },
    });
  }),
});
