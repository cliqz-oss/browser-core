import Ember from 'ember';
import IscrollListMixin from 'fresh-tab/mixins/iscroll-list';
import { module, test } from 'qunit';

module('Unit | Mixin | iscroll list');

// Replace this with your real tests.
test('it works', function(assert) {
  let IscrollListObject = Ember.Object.extend(IscrollListMixin);
  let subject = IscrollListObject.create();
  assert.ok(subject);
});
