import GenericResult from './generic';
import BaseResult from './base';
import prefs from '../../core/prefs';
import utils from '../../core/utils';


class CloseButton extends BaseResult {
  click(window, href) {
    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    if (action.actionName === 'close') {
      prefs.set('retirementIgnoredOn', prefs.get('config_ts', '-'));
      this.actions.removeResult(this);

      utils.telemetry({
        type: 'retirement',
        target: 'tp',
        action: 'close'
      });
    }
  }
}

export default class RetirementResult extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);
  }

  click(window, href, ev) {
    if (href.indexOf('cliqz-actions,{"type":"retirement"') !== 0) {
      // if this is not a click on close it must be on install
      utils.telemetry({
        type: 'retirement',
        target: 'tp',
        action: 'install'
      });
    }
    super.click(window, href, ev);
  }

  get template() {
    return 'retirement';
  }

  get url() {
    return 'https://addons.mozilla.org/firefox/addon/cliqz';
  }

  get headline() {
    let date;
    switch (prefs.get('config_ts', '-')) {
      case '20180415':
        date = utils.getLocalizedString('retirement.testpilot.headline.tomorrow');
        break;
      case '20180416':
        date = utils.getLocalizedString('retirement.testpilot.headline.today');
        break;
      default:
        date = utils.getLocalizedString('retirement.testpilot.headline.date');
    }

    return utils.getLocalizedString('retirement.testpilot.headline', date);
  }

  get allResults() {
    return [
      ...this.selectableResults,
      this.closeButton
    ];
  }

  get closeButton() {
    const btn = new CloseButton({
      title: 'close-button',
      url: `cliqz-actions,${JSON.stringify({ type: 'retirement', actionName: 'close' })}`,
    });
    btn.actions = this.actions;
    return btn;
  }
}
