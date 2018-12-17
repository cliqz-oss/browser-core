import GenericResult from './generic';
import BaseResult from './base';
import i18n from '../../core/content/i18n';

class CloseButton extends BaseResult {
  click(href) {
    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    if (action.actionName === 'close') {
      this.parent.actions.getPref('config_ts').then((today) => {
        this.parent.actions.setPref('retirementIgnoredOn', today);
      });

      this.parent.actions.removeResult(this.parent);
      this.parent.actions.telemetry({
        type: 'retirement',
        target: 'amosearch',
        action: 'close'
      });
    }
  }
}
class MoreButton extends BaseResult {
  click(href, ev) {
    this.parent.actions.telemetry({
      type: 'retirement',
      target: 'amosearch',
      action: 'more'
    });
    super.click(href, ev);
  }
}
class Close4Ever extends BaseResult {
  click(href) {
    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    if (action.actionName === 'close4ever') {
      this.parent.actions.setPref('retirementIgnoredOn', '4EVER');
      this.parent.actions.removeResult(this.parent);
      this.parent.actions.telemetry({
        type: 'retirement',
        target: 'amosearch',
        action: 'close4ever'
      });
    }
  }
}
export default class RetirementResult extends GenericResult {
  click(href, ev) {
    if (href === this.url) {
      this.actions.telemetry({
        type: 'retirement',
        target: 'amosearch',
        action: 'more'
      });
    }
    super.click(href, ev);
  }
  get template() {
    return 'retirement';
  }
  get url() {
    return 'https://cliqz.com/lp/cliqzchanges';
  }
  get selectableResults() {
    // we only allow it to be selectable when it's at the bottom of the result set
    return [];
  }
  get headline() {
    return i18n.getMessage('retirement.headline');
  }
  get allResults() {
    return [
      this,
      this.closeButton,
      this.moreButton,
      this.close4Ever
    ];
  }
  get closeButton() {
    const btn = new CloseButton({
      title: 'Close',
      url: `cliqz-actions,${JSON.stringify({ type: 'retirement', actionName: 'close' })}`,
    });
    btn.parent = this;
    return btn;
  }
  get moreButton() {
    const btn = new MoreButton({
      title: 'More',
      url: i18n.getMessage('retirement.more.url')
    });
    btn.parent = this;
    return btn;
  }
  get close4Ever() {
    const btn = new Close4Ever({
      title: 'Close',
      url: `cliqz-actions,${JSON.stringify({ type: 'retirement', actionName: 'close4ever' })}`
    });
    btn.parent = this;
    return btn;
  }
}
