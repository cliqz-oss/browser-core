/* eslint no-use-before-define: ["error", { "classes": false }] */
import {
  urlStripProtocol,
  cleanMozillaActions,
} from '../../core/content/url';

export default class BaseResult {
  constructor(rawResult, resultTools) {
    this.rawResult = {
      data: {},
      ...rawResult,
    };
    this.resultTools = resultTools;
  }

  get template() {
    return 'generic';
  }

  get query() {
    return this.rawResult.text;
  }

  get urlbarValue() {
    return this.displayUrl || this.url;
  }

  get cssClasses() {
    const classes = [];
    if (this.rawResult.isCluster) {
      classes.push('history-cluster');
    }
    return classes.join(' ');
  }

  get kind() {
    return this.rawResult.data.kind || this.rawResult.kind || [''];
  }

  get title() {
    return this.rawResult.title || urlStripProtocol(this.rawResult.url || '');
  }

  get meta() {
    return this.rawResult.meta || {};
  }

  get logo() {
    return this.meta.logo;
  }

  get localSource() {
    const data = this.rawResult.data || {};
    return data.localSource || this.rawResult.style || '';
  }

  get friendlyUrl() {
    return this.rawResult.friendlyUrl;
  }

  get historyUrl() {
    const [, url] = cleanMozillaActions(this.meta.originalUrl || this.url);
    return url;
  }

  get isPrivateResult() {
    if (this.kind.length === 0) {
      return false;
    }

    const onlyType = this.kind[0].split('|')[0];
    const hasCluster = this.kind.some(a => a.startsWith('C|'));

    if (hasCluster) {
      // we want to be extra carefull and do not send back any cluster information
      return true;
    }

    return this.kind.length === 1 && 'HBTCS'.indexOf(onlyType) !== -1;
  }

  get isActionSwitchTab() {
    return this.localSource.indexOf('switchtab') !== -1;
  }

  get isBookmark() {
    return this.localSource.indexOf('bookmark') !== -1;
  }

  get isCliqzAction() {
    return this.rawResult.url && this.rawResult.url.indexOf('cliqz-actions') === 0;
  }

  get isAdult() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.adult;
  }

  get isCalculator() {
    const data = this.rawResult.data || {};
    return data.template === 'calculator';
  }

  get isCurrency() {
    const data = this.rawResult.data || {};
    return data.template === 'currency';
  }

  get isSuggestion() {
    const data = this.rawResult.data || {};
    return data.template === 'suggestion';
  }

  get icon() {
    let icon;

    if (this.isBookmark) {
      icon = 'bookmark';
    }

    if (this.isActionSwitchTab) {
      icon = 'switchtab';
    }

    return icon;
  }

  get url() {
    let url = this.rawResult.url;
    if (this.isAd && this.urlAd) {
      url = this.urlAd;
    }

    if (this.isActionSwitchTab) {
      return `moz-action:switchtab,${JSON.stringify({ url: encodeURIComponent(url) })}`;
    }
    return url;
  }

  get displayUrl() {
    return this.rawResult.url;
  }

  get description() {
    return this.rawResult.description || '';
  }

  get image() {
    return this.rawResult.image;
  }

  get source() {
    return this.meta.domain;
  }

  get updated() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.last_updated_ago;
  }

  get isAd() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.is_ad && this.resultTools.assistants.offers.isEnabled;
  }

  get urlAd() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.url_ad;
  }

  get selectableResults() {
    return [
      ...(this.url ? [this] : []),
    ];
  }

  get allResults() {
    return [
      ...this.selectableResults,
    ];
  }

  isUrlMatch(href) {
    return this.url === href;
  }

  findResultByUrl(href) {
    return this.allResults.find(r => r.isUrlMatch(href));
  }

  hasUrl(href) {
    return Boolean(this.findResultByUrl(href));
  }

  get isHistory() {
    return this.kind.find(k => k === 'H');
  }

  get isDeletable() {
    return this.isHistory;
  }

  serialize() {
    const topResult = this.resultTools.results.find(this.url);
    const safeResult = JSON.parse(JSON.stringify(this.rawResult));

    // only consider sub results that are whitelisted by having a `type`
    const isSubResult = this !== topResult && this.type;
    const subResult = isSubResult ? {
      type: this.type,
      // relative index: index amongst other sub results of same type
      index: topResult.selectableResults
        .filter(({ type }) => type === this.type)
        .findIndex(({ url }) => url === this.url),
    } : {};

    return {
      ...safeResult,
      kind: this.kind,
      query: this.query,
      index: this.resultTools.results.indexOf(topResult),
      isBookmark: this.isBookmark,
      isDeletable: this.isDeletable,
      historyUrl: this.historyUrl,
      isPrivateResult: this.isPrivateResult,
      urlbarValue: this.urlbarValue,
      subResult,
    };
  }

  click(href, ev, meta = {}) {
    if (this.isUrlMatch(href)) {
      const newTab = ev.altKey || ev.metaKey || ev.ctrlKey || ev.button === 1;

      this.resultTools.actions.openLink(this.url, {
        result: this.serialize(),
        resultOrder: this.resultTools.results.kinds,
        newTab,
        eventType: ev instanceof MouseEvent ? 'mouse' : 'keyboard',
        eventOptions: {
          type: ev.type,
          button: ev.button,
        },
        meta,
      });
    } else {
      this.findResultByUrl(href).click(href, ev, meta);
    }
  }

  /*
   * Lifecycle hook
   */
  didRender(...args) {
    const allButThisResult = this.allResults.filter(r => !r.isUrlMatch(this.url));
    allButThisResult.forEach(result => result.didRender(...args));
  }
}

export class Subresult extends BaseResult {
  constructor(parent, rawResult) {
    super(rawResult, parent.resultTools);
    const parentRawResult = parent.rawResult || {};
    const meta = this.rawResult.meta;
    Object.assign(this.rawResult, {
      kind: parentRawResult.kind,
      type: parentRawResult.type,
      provider: parentRawResult.provider,
      meta: {
        ...meta,
        logo: (meta && meta.logo) || (parentRawResult.meta && parentRawResult.meta.logo),
      },
    }, rawResult);
  }
}
