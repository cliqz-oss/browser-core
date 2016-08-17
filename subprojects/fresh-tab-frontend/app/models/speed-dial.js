import Ember from "ember";

export default Ember.Object.extend({
  save() {
    const url = this.get('url');
    const index = this.get('index');
    return this.get('cliqz').addSpeedDial(url, index).then(obj => {
      if ('error' in obj) {
        throw obj.error;
      } else {
        this.setProperties(obj);
      }
    });
  }
});
