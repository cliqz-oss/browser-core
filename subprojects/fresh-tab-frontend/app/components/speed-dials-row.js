import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  setup: function () {
    this.setProperties({
      limit: 5,
      removedSpeedDials: []
    })
  }.on("init"),

  showAddButton: Ember.computed.and('isCustom', 'displayAddBtn'),

  displayAddBtn: Ember.computed.lt('speedDials.length', 5),

  displayHistoryLabel: Ember.computed('speedDials.length', 'removedSpeedDials.length', function() {
    return this.get('speedDials.length') > 0 || this.get('removedSpeedDials.length') > 0
  }),

  isCustom: Ember.computed.equal("type", "custom"),

  speedDials: Ember.computed('model.[]', 'limit', function () {
    return this.get("model").slice(0, this.get("limit"));
  }),

  manyRemoved: Ember.computed.gt('removedSpeedDials.length', 1),

  actions: {
    addToCustom(speedDial) {
      this.get("model").pushObject(speedDial);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'add-customsite'
      });
      this.set('removedSpeedDials', []);
    },

    reAddSpeedDial(speedDial) {
      const index = speedDial.get('removedAt');
      const model = this.get('model');
      this.get('cliqz').addSpeedDial(speedDial.get('url'), index).then(() => {
        this.get("removedSpeedDials").removeObject(speedDial);
        model.insertAt(index, speedDial);
      });
    },

    remove(speedDial) {
      speedDial.setProperties({
        removedAt: this.get("model").indexOf(speedDial),
      });
      const removeList = this.get("removedSpeedDials");
      const type = speedDial.get("custom") ? "custom" : "history";

      const model = this.get("model");
      removeList.pushObject(speedDial)
      const index = model.indexOf(speedDial);


      this.get("model").removeObject(speedDial);
      this.get('cliqz').removeSpeedDial(speedDial.toJSON());

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'remove-' + type,
        target_index: index
      });
    },

    closeUndo(type, forceClose) {
      this.set('removedSpeedDials', []);
      if(type !== undefined && !forceClose) {
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'click',
          target_type: 'close-history-undo'
        });
      }
    },

    undoRemoval() {
      const speedDial = this.get('removedSpeedDials').popObject();

      const type = this.get("isCustom") ? 'custom' : 'history';

      if(this.get("isCustom")) {
        this.actions.reAddSpeedDial.call(this, speedDial);
      } else {
        this.get('cliqz').revertHistorySpeedDial(speedDial.get("url"));
        this.get('model').insertAt(speedDial.get("removedAt"), speedDial);
      }

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'undo-' + type + '-remove'
      });
    },

    resetAll() {
      this.get('cliqz').resetAllHistory().then(results => {
        this.set('model', results.history.map( dial => Ember.Object.create(dial) ))
        this.actions.closeUndo.call(this, 'history', true);
      });

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'reset-all-history'
      });
    }
  }
});
