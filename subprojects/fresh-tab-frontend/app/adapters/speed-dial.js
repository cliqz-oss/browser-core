import DS from 'ember-data';
import Ember from 'ember';

export default DS.Adapter.extend({
  cliqz: Ember.inject.service('cliqz'),

  createRecord: function(store, type, snapshot) {
    const { url, index } = this.serialize(snapshot);
    return this.get('cliqz').addSpeedDial(url, index).then(obj => {
      if ('error' in obj) {
        throw obj.error;
      } else {
        return obj;
      }
    });
  },
});
