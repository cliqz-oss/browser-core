import { expect } from 'chai';
import { context } from 'mocha';
import { describeComponent, it } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent('speed-dial', 'Integration | Component | speed dial',
  {
    integration: true
  },
  function() {
    context('context menu', function () {
      it('render context menu', function() {
        const index = 1;
        const type = 'history';
        this.setProperties({
          index,
          type
        });
        this.render(hbs`{{speed-dial index=index type=type}}`);
        expect(this.$(`menu#speedDialCMenu-${index}-${type}`)).to.have.length(1);
      });

      context('notification options', function () {
        it('render notifications enable option if available', function() {
          this.set('model', {
            notificationsAvailable: true,
            notificationsEnabled: true,
          });
          this.render(hbs`{{speed-dial model=model}}`);
          expect(this.$(`menuitem.action-notifications-enabled`)).to.have.length(1);
        });

        it('render notifications disable option if available', function() {
          this.set('model', {
            notificationsAvailable: true,
            notificationsEnabled: false,
          });
          this.render(hbs`{{speed-dial model=model}}`);
          expect(this.$(`menuitem.action-notifications-disabled`)).to.have.length(1);
        });

        it('render notifications disable option if inaccessible', function() {
          this.set('model', {
            notificationsAvailable: true,
            notificationsEnabled: false,
            notificationInaccesible: true

          });
          this.render(hbs`{{speed-dial model=model}}`);
          expect(this.$(`menuitem.action-notifications-enabled`)).to.have.length(1);
        });

        it('render no actions if notifications not available', function() {
          this.set('model', {
            notificationsAvailable: false
          });
          this.render(hbs`{{speed-dial model=model}}`);
          expect(this.$(`menuitem.action-notifications-enable`)).to.have.length(0);
          expect(this.$(`menuitem.action-notifications-disabled`)).to.have.length(0);
        });
      });
    });
  }
);
