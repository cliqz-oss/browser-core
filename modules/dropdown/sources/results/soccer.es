import BaseResult from './base';
import GenericResult from './generic';
import utils from '../../core/utils';

class LiveTickerResult extends BaseResult {
  get locale() {
    return utils.getLocalizedString('locale_lang_code');
  }

  getTime(gameTime) {
    const options = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    const date = gameTime;

    if (date) {
      return new Date(Number(date) * 1000).toLocaleDateString(this.locale, options);
    }

    return '';
  }

  get host() {
    return this.rawResult.match.HOST;
  }

  get hostLogo() {
    return this.rawResult.match.hostLogo;
  }

  get scored() {
    return this.rawResult.match.scored || '- : -';
  }

  get guest() {
    return this.rawResult.match.GUESS;
  }

  get guestLogo() {
    return this.rawResult.match.guestLogo;
  }

  get gameTime() {
    return this.getTime(this.rawResult.match.gameUtcTimestamp);
  }

  get liveOn() {
    return this.rawResult.match.tvChannelLogo;
  }

  get isLive() {
    return this.rawResult.match.isLive;
  }

  get leagueLogo() {
    return this.rawResult.match.leagueLogo;
  }

  get leagueName() {
    return this.rawResult.match.leagueName;
  }

  get url() {
    return this.rawResult.match.live_url;
  }
}

class LiveTickerRound extends GenericResult {
  get round() {
    return this.rawResult.round;
  }

  get isCurrent() {
    return this.rawResult.isCurrent;
  }

  get allResults() {
    return this.rawResult.week.matches.map(match => new LiveTickerResult({
      match,
    }));
  }
}

class TableItemResult extends BaseResult {
  get rank() {
    return this.rawResult.item.rank;
  }

  get logo() {
    return this.rawResult.item.logo;
  }

  get club() {
    return this.rawResult.item.club;
  }

  get played() {
    return this.rawResult.item.SP;
  }

  get won() {
    return this.rawResult.item.S;
  }

  get lost() {
    return this.rawResult.item.N;
  }

  get drawn() {
    return this.rawResult.item.U;
  }

  get goals() {
    return `${this.rawResult.item.T}-${this.rawResult.item.GT}`;
  }

  get goalsDiff() {
    return this.rawResult.item.TD;
  }

  get points() {
    return this.rawResult.item.PKT;
  }

  get qualified() {
    return 'resource://cliqz/dropdown/images/champions-league.png';
  }
}

class SoccerSubResult extends BaseResult {
}

export default class extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);

    // De-duplicate sub result from extra
    if (allResultsFlat.indexOf(rawResult.data.extra.url) >= 0) {
      delete this.rawResult.data.extra.url;
      delete this.rawResult.data.extra.title;
    } else {
      allResultsFlat.push(rawResult.data.extra.url);
    }

    this.internalResultsLimit = 3;
  }
  get template() {
    return `soccer/${this.currentSubTemplate}`;
  }

  get currentSubTemplate() {
    return this.rawResult.data.template;
  }

  get extra() {
    return this.rawResult.data.extra || {};
  }

  get allResults() {
    return [
      ...this.selectableResults,
      ...this.soccerResults,
    ];
  }

  get selectableResults() {
    return [
      ...(this.url ? [this] : []),
      ...(super.internalResults).slice(0, this.internalResultsLimit),
      ...(this.subResult ? [this.subResult] : []),
      // ...(super.newsResults).slice(0, this.internalResultsLimit), // Disabled news for now
    ];
  }

  get soccerResults() {
    let results = [];

    switch (this.currentSubTemplate) {
      case 'ligaEZ1Game':
        results = this.ligaEZ1Game;
        break;
      case 'liveTicker':
        results = this.liveTicker
                    .map(round => round.allResults)
                    .reduce((arr, el) => [...arr, ...el]
                    , []);
        break;
      case 'ligaEZTable':
        results = this.ligaEZTable;
        break;
      default:
        results = [];
    }

    return results;
  }

  get ligaEZ1Game() {
    const results = this.extra.matches.map(match => new LiveTickerResult({
      match,
      text: this.rawResult.text,
    }));

    return results;
  }

  get liveTicker() {
    const results = this.extra.weeks.map(week => new LiveTickerRound({
      round: week.round,
      isCurrent: week.isCurrent,
      week,
    }));

    return results;
  }

  get ligaEZTable() {
    const results = this.extra.ranking.map(item => new TableItemResult({
      item,
    }));

    return results;
  }

  get subResult() {
    if (!this.extra.url || !this.extra.title) {
      return null;
    }

    return new SoccerSubResult({
      url: this.extra.url,
      title: this.extra.title,
    });
  }
}
