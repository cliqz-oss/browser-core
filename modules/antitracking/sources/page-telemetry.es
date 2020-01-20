import { truncatedHash } from '../core/helpers/md5';
import { parse } from '../core/url';

function truncatePath(path) {
  // extract the first part of the page path
  const [prefix] = path.substring(1).split('/');
  return `/${prefix}`;
}

export default function buildPageLoadObject(page) {
  const urlParts = parse(page.url);
  const tps = {};
  for (const [domain, stats] of page.requestStats.entries()) {
    tps[domain] = stats;
  }
  return {
    hostname: truncatedHash(urlParts.hostname),
    path: truncatedHash(truncatePath(urlParts.path)),
    scheme: urlParts.scheme,
    c: 1,
    t: page.destroyed - page.created,
    active: page.activeTime,
    counter: page.counter,
    ra: 0,
    tps,
    placeHolder: false,
    redirects: [],
    redirectsPlaceHolder: [],
    triggeringTree: {},
    tsv: page.tsv,
    tsv_id: page.tsvId !== undefined,
    frames: {},
    cmp: page.annotations.cmp,
    hiddenElements: page.annotations.hiddenElements,
  };
}
