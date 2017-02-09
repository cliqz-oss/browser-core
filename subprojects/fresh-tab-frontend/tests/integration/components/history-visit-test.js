import { expect } from 'chai';
import { describeComponent, it } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent('history-visit', 'Integration | Component | history visit',
  {
    integration: true
  },
  function() {
    it('renders', function() {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // this.render(hbs`
      //   {{#history-visit}}
      //     template content
      //   {{/history-visit}}
      // `);

      this.render(hbs`{{history-visit}}`);
      expect(this.$()).to.have.length(1);
    });
  }
);
