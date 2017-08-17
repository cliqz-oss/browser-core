import background from '../core/base/background';
import { utils, events } from 'core/cliqz';
import Reporter from 'telemetry-categories/reporter';
import ResourceLoader from 'core/resource-loader';

/**
* @class Background
* @namespace telemetry-categories
*/
export default background({
  /**
  * @method init
  */
  init() {
    this.loader = new ResourceLoader(
      [ 'telemetry-categories', 'categories.json' ],
      {
        remoteURL: 'https://cdn.cliqz.com/domain-categories/categories.json',
        cron: 24 * 60 * 60 * 1000, // 24 hours
      }
    );
  },
  /**
  * @method start
  */
  start() {
    if ( this.reporter || utils.getPref( 'categoryAssessment', false ) === false ) {
      return;
    }

    this.loader.load().then( categories => {
      this.reporter = new Reporter( categories );

      this.reporter.start();
    });

    this.loader.onUpdate( categories => {
      if ( !this.reporter ) {
        return;
      }

      this.reporter.updateCategories( categories );
    });
  },
  /**
  * @method unload
  */
  unload() {
    this.loader.stop();

    if ( this.reporter ) {
      this.reporter.stop();
    }
  },

  actions: {
    assess(url) {
      if (!this.reporter) {
        return;
      }
      return this.reporter.assess(url);
    }
  },

  events: {
    'core.location_change': function onLocationChange(url) {
      this.actions.assess(url);
    },
  },

});
