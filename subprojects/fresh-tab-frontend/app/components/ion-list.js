import RecognizerMixin from 'ember-gestures/mixins/recognizers';
import Ember from "ember";

export default Ember.Component.extend(RecognizerMixin, {
  recognizers: 'pan',

  tagName: 'ul',

  classNames: ['list'],

  panUp() {
  },

  panDown() {
  }
});
