import GenericResult from './generic';
import BaseResult from './base';
import prefs from '../../core/prefs';


class CloseButton extends BaseResult {
  click(window, href) {
    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    if (action.actionName === 'close') {
      prefs.set('retirementIgnoredOn', prefs.get('config_ts', '-'));
      this.actions.removeResult(this);
    }
  }
}

export default class RetirementResult extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);
  }

  get template() {
    return 'retirement';
  }

  get url() {
    return 'https://addons.mozilla.org/firefox/addon/cliqz';
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
