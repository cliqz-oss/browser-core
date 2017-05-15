import { utils } from '../core/cliqz';
import events from '../core/events';
import background from './background';


export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if (!background.enabled()) {
      return;
    }

    this.generateDemographicsSignal(this.window);

    // When anolysis is initialized, we will send the env signal again
    this.onPrefChangeEvent = events.subscribe(
      'anolysis:initialized',
      () => this.generateDemographicsSignal(this.window),
    );
  }

  generateDemographicsSignal(window) {
    // TODO: We could actually convert to the new trees here instead of in the
    // preprocessor.
    const navigator = window.navigator;
    background.actions.handleTelemetrySignal({
      anolysis: true,
      type: 'environment',
      agent: navigator.userAgent,
      distribution: utils.getPref('distribution', ''),
      install_date: utils.getPref('install_date'),
      version: utils.extensionVersion,
      version_dist: utils.getPref('distribution.version', '', ''),
      version_host: utils.getPref('gecko.mstone', '', ''),
    });
  }

  unload() {
    if (this.onPrefChangeEvent) {
      this.onPrefChangeEvent.unsubscribe();
    }
  }
}
