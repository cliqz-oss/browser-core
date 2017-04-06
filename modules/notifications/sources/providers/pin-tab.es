import inject from '../../core/kord/inject';
import utils from '../../core/utils';
import { mapWindows } from '../../core/browser';
import { queryActiveTabs as getTabs, pinTab } from '../../core/tabs';

const domainForUrl = url => utils.getDetailsFromUrl(url).host;
const isUrlBelongToDomain = (domain, url) => domainForUrl(url) === domain;
const getWindows = mapWindows.bind(null, w => w);

const activeTabsForDomain = domain => getWindows()
  .map(getTabs)
  .reduce((all, tabs) => [...all, ...tabs], [])
  .filter(tab => isUrlBelongToDomain(domain, tab.url));

const activeUrlsForDomain = domain => activeTabsForDomain(domain)
  .map(tab => tab.url);

export default class {

  constructor({ domain, selector, attribute }) {
    this.domain = domain;
    this.selector = selector;
    this.attribute = attribute;
    this.core = inject.module('core');
  }

  count() {
    const openTabUrls = activeUrlsForDomain(this.domain);
    const urls = [...new Set(openTabUrls)]; // unique
    const countForUrl = url => this.core.action(
      'queryHTML',
      url,
      this.selector,
      this.attribute
    );

    if (!this.canCount()) {
      return Promise.reject('no-data');
    }

    return Promise.all(urls.map(countForUrl))
      .then(counts => counts.reduce((all, c) => [...all, ...c], [])) // flatten
      .then(results => {
        const count = results.find(result => result) || 0;
        return Number(count);
      })
  }

  canCount() {
    return activeTabsForDomain(this.domain).some(tab => tab.isPinned);
  }

  activate() {
    const window = utils.getWindow();
    const domain = this.domain;
    let tab = getTabs(window).find(
      tab => isUrlBelongToDomain(domain, tab.url)
    );

    if (!tab) {
      tab = utils.openLink(window, domain, true);
    }

    if (tab) {
      pinTab(window, tab);
    }

    return Boolean(tab);
  }
}
