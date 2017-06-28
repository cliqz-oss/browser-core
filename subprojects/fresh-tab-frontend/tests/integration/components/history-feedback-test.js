import { expect } from 'chai';
import { describeComponent, it } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent('history-feedback', 'Integration | Component | history feedback',
  {
    integration: true
  },
  function() {
    it('renders', function() {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // this.render(hbs`
      //   {{#history-feedback}}
      //     template content
      //   {{/history-feedback}}
      // `);

      this.render(hbs`{{history-feedback}}`);
      expect(this.$()).to.have.length(1);
    });
  }
);
