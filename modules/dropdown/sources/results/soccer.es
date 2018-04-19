import BaseResult from './base';
import GenericResult from './generic';
import utils from '../../core/utils';
import config from '../../core/config';

const LIMIT = {
  ligaEZ1Game: {
    rowsLimit: 2,
    maxRowsLimit: 10,
  },
  liveTicker: {
    rowsLimit: 2,
    maxRowsLimit: 10,
  },
  ligaEZTable: {
    rowsLimit: 6,
    maxRowsLimit: 20,
  },
  ligaEZGroup: {
    rowsLimit: 4,
    maxRowsLimit: 4,
  },
};

class ExpandButton extends BaseResult {
  get displayUrl() {
    return this.rawResult.text;
  }

  get show() {
    return this.rawResult.show;
  }

  click() {
    this.rawResult.onClick();
  }
}

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
      text: this.rawResult.text,
      url: match.live_url,
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
    return this.rawResult.item.goals;
  }

  get goalsDiff() {
    return this.rawResult.item.TD;
  }

  get points() {
    return this.rawResult.item.PKT;
  }

  get qualified() {
    return `${config.baseURL}dropdown/images/champions-league.png`;
  }
}

class TableResult extends BaseResult {
  get tableHeader() {
    const infoList = this.rawResult.infoList;

    return {
      rank: infoList.rank,
      club: infoList.club,
      played: infoList.SP,
      won: infoList.S,
      lost: infoList.N,
      drawn: infoList.U,
      goals: infoList.goals,
      goalsDiff: infoList.TD,
      points: infoList.PKT,
    };
  }

  get tableData() {
    const results = this.rawResult.ranking.map(item => new TableItemResult({
      item,
    }));

    return results;
  }

  get table() {
    return {
      header: this.tableHeader,
      data: this.tableData,
      rowsLimit: this.rawResult.itemsLimit,
    };
  }
}

class TableGroup extends BaseResult {
  get groupName() {
    return this.rawResult.groupName;
  }

  get ligaEZTable() {
    return this.rawResult.ligaEZTable;
  }
}

class SoccerSubResult extends BaseResult {
}

export default class SoccerResult extends GenericResult {
  constructor(rawResult, allResultsFlat = []) {
    super(rawResult, allResultsFlat);

    // De-duplicate sub result from extra
    if (allResultsFlat.indexOf(rawResult.data.extra.url) >= 0) {
      delete this.rawResult.data.extra.url;
      delete this.rawResult.data.extra.title;
    } else {
      allResultsFlat.push(rawResult.data.extra.url);
    }

    this.internalResultsLimit = 4;
    this.newsResultsLimit = 2;
    this.itemsLimit = this.rowsLimit;
  }

  get rowsLimit() {
    return LIMIT[this.currentSubTemplate].rowsLimit;
  }

  get maxRowsLimit() {
    return LIMIT[this.currentSubTemplate].maxRowsLimit;
  }

  get template() {
    return 'soccer';
  }

  get currentSubTemplate() {
    return this.rawResult.data.template;
  }

  get currentPartial() {
    return `partials/soccer/${this.currentSubTemplate}`;
  }

  get extra() {
    return this.rawResult.data.extra || {};
  }

  get allResults() {
    return [
      ...this.selectableResults,
      ...this.soccerResults,
      this.expandButton,
      this.poweredByResult,
    ];
  }

  get selectableResults() {
    return [
      ...(this.url ? [this] : []),
      ...(super.internalResults).slice(0, this.internalResultsLimit),
      ...(this.subResult ? [this.subResult] : []),
      ...(super.newsResults).slice(0, this.newsResultsLimit),
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
          .reduce((arr, el) => [...arr, ...el], []);
        break;
      case 'ligaEZTable':
      case 'ligaEZGroup':
        results = [];
        break;
      default:
        results = [];
    }

    return results;
  }

  get ligaEZ1Game() {
    const results = this.extra.matches.map(match => new LiveTickerResult({
      match,
      text: this.query,
      url: match.live_url,
    }));

    return results;
  }

  get liveTicker() {
    const results = this.extra.weeks.map(week => new LiveTickerRound({
      round: week.round,
      isCurrent: week.isCurrent,
      week,
      text: this.query,
    }));

    return results;
  }

  get ligaEZTable() {
    const result = new TableResult({
      ranking: this.extra.ranking,
      infoList: this.extra.info_list,
      itemsLimit: this.itemsLimit,
    });

    return result.table;
  }

  get ligaEZGroup() {
    const results = this.extra.groups.map(item => new TableGroup({
      groupName: item.group,
      group: item,
      ligaEZTable: new TableResult({
        ranking: item.ranking,
        infoList: item.info_list,
        itemsLimit: this.itemsLimit,
      }).table,
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
      text: this.query,
    });
  }

  get newsAvailable() {
    return super.newsResults.length > 0;
  }

  get numberOfNews() {
    if (super.newsResults.length >= this.newsResultsLimit) {
      return this.newsResultsLimit;
    }

    return super.newsResults.length;
  }

  get expandButton() {
    return new ExpandButton({
      title: 'soccer-expand-button',
      url: `cliqz-actions,${JSON.stringify({ type: 'soccer', actionName: 'expand' })}`,
      text: this.rawResult.text,
      show: this.itemsLimit < this.maxRowsLimit,
      onClick: () => {
        const signal = {
          type: 'results',
          action: 'click',
          view: 'SoccerEZ',
          target: 'show_more',
        };
        utils.telemetry(signal);

        this.itemsLimit = this.maxRowsLimit;
        this.actions.replaceResult(this, this);
      }
    });
  }

  get poweredByResult() {
    return new BaseResult({
      url: 'http://www.kicker.de/',
      title: 'soccer-powered-by',
      text: this.query,
    });
  }

  get groupTableHeader() {
    return this.extra.group_name;
  }

  didRender($dropdown) {
    super.didRender($dropdown);
    const $allLabels = $dropdown.querySelectorAll('.soccer .dropdown-tab');
    $allLabels.forEach((label) => {
      label.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        [...$allLabels].forEach(l => l.classList.remove('checked'));
        e.target.classList.add('checked');

        const signal = {
          type: 'results',
          action: 'click',
          view: 'SoccerEZ',
          target: 'tab',
          index: [...$allLabels].indexOf(e.target),
        };
        utils.telemetry(signal);
      });
    });
  }
}
