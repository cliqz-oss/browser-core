import JourneyCollector from './collector';
import JourneySignals from './signal-connector';
import UnknownPage from './features/unknown-page';

/**
 * Journey collection
 *
 * Journey is stored in `JourneyCollector` and collected by calling
 * its `addEvent` method.
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

    this.unknownPageFeature = new UnknownPage(
      this.eventHandler,
      this.journeyCollector
    );
    this.unknownPageFeature.init(); // sync
  }

  async destroy() {
    this.unknownPageFeature.destroy(); // sync
    await this.journeySignals.destroy();
  }

  getSignalHandler() {
    return this.journeySignals;
  }

  addEvent(...args) {
    return this.journeyCollector.addEvent(...args);
  }
}
