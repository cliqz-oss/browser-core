import { expect } from 'chai';
import { describeComponent, it } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent('history-session', 'Integration | Component | history session',
  {
    integration: true
  },
  function() {
    it('renders', function() {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // this.render(hbs`
      //   {{#history-session}}
      //     template content
      //   {{/history-session}}
      // `);

      this.render(hbs`{{history-session}}`);
      expect(this.$()).to.have.length(1);
    });
  }
);
