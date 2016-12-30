import { expect } from 'chai';
import Ember from 'ember';
import { describeComponent, it } from 'ember-mocha';
import { context, beforeEach } from 'mocha';

const notificationsService = Ember.Service.extend({
  disableNotifications() {}
});

describeComponent('speed-dial', 'Unit | Component | speed dial',
  {
    // Specify the other units that are required for this test
    needs: [],
    unit: true
  },
  function() {
    beforeEach(function () {
      this.register('service:notifications', notificationsService);
    });

    context('actions', function() {
      context('remove', function() {
        it('calls external action "removeAction" with a model', function(done) {
          const speedDial = Ember.Object.create({});
          const component = this.subject({
            model: speedDial
          });

          component.sendAction = function(actionName, model) {
            expect(actionName).to.be.eq('removeAction');
            expect(model).to.be.equal(speedDial)
            done();
          }

          component.actions.remove.call(component);
        });

        it('calls disable notification if it was enabled', function(done) {
          const model = Ember.Object.create({
            notificationsEnabled: true
          });
          const component = this.subject({
            model
          });

          component.set('notifications', {
            disableNotifications: function(speedDial) {
              expect(speedDial).to.be.eq(model);
              done();
            }
          });

          component.actions.remove.call(component);
        });

        it('doesnt call disable notification if it was disabled', function() {
          let called = false;
          const model = Ember.Object.create({
            notificationsEnabled: false,
            notifications: Ember.Object.create({
              disableNotifications() {
                called = true;
              }
            })
          });
          const component = this.subject({
            model
          });

          component.actions.remove.call(component);
          expect(called).to.be.false;
        });
      });
    })
  }
);
