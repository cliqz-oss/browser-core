import inject from '../../core/kord/inject';

const callAction = (module, action, ...args) => inject.module(module).action(action, ...args);
const createModuleWrapper = (module, actions) =>
  actions.reduce((all, action) =>
    ({ ...all, [action]: callAction.bind(null, module, action) }), {});

export default class Cliqz {
  constructor() {
    this.mobileCards = createModuleWrapper('mobile-cards', [
      'openLink',
      'callNumber',
      'openMap',
      'hideKeyboard',
      'sendUIReadySignal',
      'handleAutocompletion',
      'getConfig',
      'getTrackerDetails',
    ]);

    this.core = createModuleWrapper('core', []);
    this.search = createModuleWrapper('search', ['getSnippet', 'reportHighlight']);
    this.geolocation = createModuleWrapper('geolocation', ['updateGeoLocation']);
  }
}
