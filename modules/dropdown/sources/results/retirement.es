import GenericResult from './generic';
import BaseResult from './base';
import prefs from '../../core/prefs';
import utils from '../../core/utils';


class CloseButton extends BaseResult {
  click(window, href) {
    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    if (action.actionName === 'close') {
      prefs.set('retirementIgnoredOn', prefs.get('config_ts', '-'));
      this.parent.actions.removeResult(this.parent);

      utils.telemetry({
        type: 'retirement',
        target: 'tp',
        action: 'close'
      });
    }
  }
}

class MoreButton extends BaseResult {
  click(window, href, ev) {
    utils.telemetry({
      type: 'retirement',
      target: 'tp',
      action: 'more'
    });

    super.click(window, href, ev);
  }
}

export default class RetirementResult extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);
  }

  click(window, href, ev) {
    if (href === this.url) {
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

  get selectableResults() {
    // we only allow it to be selectable when it's at the bottom of the result set
    return [];
  }

  get headline() {
    let date;
    switch (prefs.get('config_ts', '-')) {
      case '20180507':
        date = utils.getLocalizedString('retirement.chip.headline.tomorrow');
        break;
      case '20180508':
        date = utils.getLocalizedString('retirement.chip.headline.today');
        break;
      default:
        date = utils.getLocalizedString('retirement.chip.headline.date');
    }

    return utils.getLocalizedString('retirement.chip.headline', date);
  }

  get allResults() {
    return [
      this,
      this.closeButton,
      this.moreButton
    ];
  }

  get closeButton() {
    const btn = new CloseButton({
      title: 'close-button',
      url: `cliqz-actions,${JSON.stringify({ type: 'retirement', actionName: 'close' })}`,
    });
    btn.parent = this;
    return btn;
  }

  get moreButton() {
    const btn = new MoreButton({
      title: 'more-button',
      url: utils.getLocalizedString('retirement.chip.more.url')
    });
    return btn;
  }
}
