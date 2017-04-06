import inject from '../core/kord/inject';
import background from '../core/base/background';
import SuspiciousUrlCheck from './suspicious-url-check';

/**
 * This module aims to detect malicous software installed on the user's
 * machine, then protect them against these threats.
 *
 * The first iteration is the detection of extensions causing suspicious
 * third party requests. This is done by tapping into the anti-tracking
 * module's process pipeline to check for these requests in action.
 *
 * @namespace  antispyware
 * @class  Background
 */
export default background({

  antitracking: inject.module('antitracking'),

  init() {
    // telemetry is handled by the antitracking telemetry action
    this.telemetry = opts => this.antitracking.action('telemetry', opts);

    this.suspiciousChecker = new SuspiciousUrlCheck(this.telemetry);
    return this.suspiciousChecker.init().then(
      () => this.antitracking.action('addPipelineStep', {
        name: 'checkIsSuspicious',
        stages: ['open'],
        after: ['determineContext', 'checkSameGeneralDomain', 'attachStatCounter'],
        fn: this.suspiciousChecker.checkIsSuspicious.bind(this.suspiciousChecker),
      }),
    );
  },

  unload() {
    this.antitracking.action('removePipelineStep', 'checkIsSuspicious');
    this.suspiciousChecker.unload();
  },

});
