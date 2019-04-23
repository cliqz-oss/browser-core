import JourneyCollector from './collector';
import JourneySignals from './signal-connector';
import NewPage from './features/new-page';

/**
 * Journey collection
 *
 * Journey is stored in `JourneyCollector` and collected by calling
 * its `addStep` and `addFeature` methods.
 *
 * `JourneySignals` remembers current user journey on important events,
 * such as the user clicked on an offer. Later, the signal system of
 * offers-v2 sends the journeys to the backend.
 *
 */
export default class JourneyHandler {
  constructor({ eventHandler }) {
    this.eventHandler = eventHandler;
  }

  async init() {
    this.journeyCollector = new JourneyCollector();
    this.journeySignals = new JourneySignals(this.journeyCollector);
    await this.journeySignals.init();

    this.newPageFeature = new NewPage(
      this.eventHandler,
      this.journeyCollector
    );
    this.newPageFeature.init(); // sync
  }

  async destroy() {
    this.newPageFeature.destroy(); // sync
    await this.journeySignals.destroy();
  }

  getSignalHandler() {
    return this.journeySignals;
  }

  addFeature(...args) {
    return this.journeyCollector.addFeature(...args);
  }
}
