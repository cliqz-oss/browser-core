/**
 * Notify `JourneyCollector` about a new page in user journey.
 * Technically, the feature `unk` is sent.
 *
 * @class UnknownPage
 */
export default class UnknownPage {
  constructor(eventHandler, journeyCollector) {
    this.eventHandler = eventHandler;
    this.journeyCollector = journeyCollector;
    this.onUrlChange = this.onUrlChange.bind(this);
  }

  init() {
    this.eventHandler.subscribeUrlChange(this.onUrlChange);
  }

  destroy() {
    this.eventHandler.unsubscribeUrlChange(this.onUrlChange);
  }

  onUrlChange() {
    this.journeyCollector.addEvent({ feature: 'unk' });
  }
}
