import BaseResult from './base';

class AdultAnswerResult extends BaseResult {
  get displayUrl() {
    return this.rawResult.text;
  }

  get className() {
    return this.rawResult.className;
  }

  click(window, href) {
    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    const adultAssistant = this.actions.adultAssistant;
    const actionName = action.actionName;
    if (!adultAssistant.hasAction(actionName)) {
      return;
    }
    adultAssistant[actionName]().then(() => {
      this.rawResult.onButtonClick();
    });
  }
}

export default class AdultQuestionResult extends BaseResult {

  get template() {
    return 'adult-question';
  }

  get internalResults() {
    return this.actions.adultAssistant.actions.map((action) => {
      let additionalClassName = '';

      if (action.actionName === 'allowOnce') {
        additionalClassName = 'adult-allow-once';
      }

      const result = new AdultAnswerResult({
        title: action.title,
        url: `cliqz-actions,${JSON.stringify({ type: 'adult', actionName: action.actionName })}`,
        text: this.rawResult.text,
        className: additionalClassName,
        onButtonClick: this.rawResult.onButtonClick,
      });
      result.actions = this.actions;
      return result;
    });
  }

  get selectableResults() {
    return this.internalResults;
  }

}
