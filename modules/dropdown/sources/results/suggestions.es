import BaseResult from './base';
import GenericResult from './generic';
import { equals } from '../../core/url';
import config from '../../core/config';

class Suggestion extends BaseResult {
  get displayText() {
    return this.rawResult.displayText;
  }

  get displayUrl() {
    return this.displayText;
  }

  click() {
    this.rawResult.onClick();
  }
}

export default class SuggestionsResult extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);

    this.rawResult.data.suggestions = this.rawResult.data.suggestions.filter((s) => {
      const url = `${config.settings.SUGGESTIONS_URL}${s}`;
      if (allResultsFlat.some(u => equals(u, url))) {
        return false;
      }
      allResultsFlat.push(url);
      return true;
    });

    this.suggestionsLimit = 3;
  }

  get template() {
    return 'suggestions';
  }

  // it is not history but makes the background color to be light gray
  get isHistory() {
    return false;
  }

  get isDeletable() {
    return false;
  }

  get suggestionResults() {
    return this.rawResult.data.suggestions.map(s => new Suggestion({
      url: `${config.settings.SUGGESTIONS_URL}${s}`,
      text: this.rawResult.text,
      displayText: s,
      onClick: () => {
        this.actions.updateTabQuery(s);
        this.actions.query(s);
      }
    }));
  }

  get suggestionAvailable() {
    return this.suggestionResults.length > 0;
  }

  get kind() {
    return [
      'inline-suggestion',
    ];
  }

  get selectableResults() {
    return this.suggestionResults.slice(0, this.suggestionsLimit);
  }

  get icon() {
    return 'search';
  }

  get defaultSearchResult() {
    return this.rawResult.defaultSearchResult || false;
  }

  get url() {
    return '';
  }
}
