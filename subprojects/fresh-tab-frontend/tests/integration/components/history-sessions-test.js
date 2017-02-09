import { expect } from 'chai';
import { describeComponent, it } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent('history-sessions', 'Integration | Component | history sessions',
  {
    integration: true
  },
  function() {
    it('renders', function() {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // this.render(hbs`
      //   {{#history-sessions}}
      //     template content
      //   {{/history-sessions}}
      // `);

      this.render(hbs`{{history-sessions}}`);
      expect(this.$()).to.have.length(1);
    });
  }
);
