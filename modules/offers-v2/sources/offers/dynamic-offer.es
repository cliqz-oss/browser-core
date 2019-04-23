import { fetch } from '../../core/http';
import logger from '../common/offers_v2_logger';


const clients = {
  mytoys: {
    searchUrl: 'https://www.mytoys.de/suche/{#QUERY#}',
  },
  cyberport: {
    searchUrl: 'https://www.cyberport.de/tools/search-results.html?autosuggest=false&q={#QUERY#}',
  },
  home24: {
    searchUrl: 'https://www.home24.de/search?query={#QUERY#}',
  },
  flaconi: {
    searchUrl: 'https://www.flaconi.de/search/?q={#QUERY#}',
  },
  lampenwelt: {
    searchUrl: 'https://www.lampenwelt.de/catalogsearch/result/?q={#QUERY#}',
  },
  yomonda: {
    searchUrl: 'https://www.yomonda.de/suche/{#QUERY#}/',
  },
  mirapodo: {
    searchUrl: 'https://www.mirapodo.de/suche/{#QUERY#}/',
  },
  ambellis: {
    searchUrl: 'https://www.ambellis.de/suche/{#QUERY#}/',
  },
  hemden: {
    searchUrl: 'https://www.hemden.de/search?sSearch={#QUERY#}'
  },
  emp: {
    searchUrl: 'https://www.emp.de/search?q={#QUERY#}'
  },
  everysize: {
    searchUrl: 'https://www.everysize.com/sneaker/?q={#QUERY#}'
  },
  'silkes-weinkeller': {
    searchUrl: 'https://www.silkes-weinkeller.de/suche/?searchparam={#QUERY#}&bdsb_search_filter_by=clear'
  },
  valmano: {
    searchUrl: 'https://www.valmano.de/suche/result/?q={#QUERY#}'
  },
  doncarne: {
    searchUrl: 'https://doncarne.de/de/search?sSearch={#QUERY#}'
  }
};

const RESULTS = ['artikel', 'results', 'suchergebnisse', 'ergebnisse', 'treffer', 'produkte'];

const RESULTS_REGEX = RESULTS.join('|');

const MINIMUM_RESULT_COUNT = 4;

function _guessQuery(nUrl, pattern) {
  if (!pattern.includes('$')) {
    return undefined;
  }

  const tokens = pattern.split('$').slice(0, -1).join('$').split(' ');
  const r = '[/=#]+?([^=/#]*?('.concat(tokens.join('|')).concat(')[^&?/]*?)([&=?/]|$)');
  const reg = new RegExp(r, 'ig');
  const matches = nUrl.match(reg);
  const [, query] = reg.exec(matches.sort((a, b) => b.length - a.length)[0]);
  return query ? query.trim().replace('-', ' ') : '';
}

function _getResultCountFromText(pageText, query) {
  let matches = new RegExp(`(\\d+)\\s*(${RESULTS_REGEX})`, 'ig').exec(pageText);
  if (matches && !query.includes(matches[1])) {
    return parseInt(matches[1], 10);
  }
  matches = new RegExp(`(${RESULTS_REGEX}):?\\s*(\\d+)`, 'ig').exec(pageText);
  if (matches && !query.includes(matches[1])) {
    return parseInt(matches[2], 10);
  }
  return 0;
}

function arrayBufferToString(buffer, encoding) {
  const byteArray = new Uint8Array(buffer);
  const string = new TextDecoder(encoding).decode(byteArray);
  return string;
}


function parseHtml(html, mimeType) {
  const dom = (new DOMParser()).parseFromString(html, mimeType);
  ['header', 'nav', 'footer'].forEach(tagName =>
    dom.querySelectorAll(tagName).forEach(node => node.parentNode.removeChild(node)));
  return { pageText: dom.body.textContent, dom };
}

function selectClient(monitors) {
  const landing = monitors.find(mon => mon.signalID === 'landing');
  if (!landing) {
    return undefined;
  }
  return landing.patterns[0].split('.')[0].replace('||', '');
}

function getSearchUrl(query, monitors) {
  let searchUrlTemplate;
  const client = selectClient(monitors);
  if (client && client in clients) {
    searchUrlTemplate = clients[client].searchUrl;
    const searchUrl = searchUrlTemplate.replace('{#QUERY#}', encodeURI(query));
    return searchUrl;
  }
  return undefined;
}

async function performSearch(searchUrl) {
  let resp;
  try {
    resp = await fetch(searchUrl);
  } catch (e) {
    logger.error(`offers/dynamic-offer/performSearch: Can't fetch '${searchUrl}': ${e.message}`);
    return { htmlContent: undefined, mimeType: undefined };
  }
  if (!resp.ok) {
    logger.error(`offers/dynamic-offer/performSearch: Can't fetch '${searchUrl}': ${resp.status}/${resp.statusText}`);
    return { htmlContent: undefined, mimeType: undefined };
  }
  const parts = (resp.headers.get('content-type') || 'text/html; charset=UTF-8').split(';');
  const encoding = (parts.length > 1 && parts[1].trim().startsWith('charset')) ? parts[1].split('=')[1] : 'utf-8';
  const htmlContent = arrayBufferToString(
    await (resp.arrayBuffer ? resp.arrayBuffer() : resp.buffer()), encoding
  );
  return { htmlContent, mimeType: parts[0] };
}

function getImageSrc(node) {
  const srcset = node.getAttribute('srcset');
  if (srcset) {
    return srcset.split(',')[0].trim();
  }
  return node.getAttribute('data-original')
  || node.getAttribute('data-echo')
  || node.getAttribute('data-src')
  || node.getAttribute('src');
}

/**
 * Groups page images based on the class of the tag and its parent
 */
function groupImagesByStyle(dom) {
  const nodes = [...dom.getElementsByTagName('img')];
  const groups = {};
  nodes.forEach((node) => {
    const key = `${node.parentNode.tagName}#${node.parentNode.getAttribute('class')}#${node.getAttribute('class')}`;
    const image = getImageSrc(node);
    if (!(key in groups)) {
      // Explicitely keep track of the first image because its the one we are really interested in
      groups[key] = { count: 0, firstImage: image, images: new Set() };
    }
    groups[key].count += 1;
    groups[key].images.add(image);
  });
  return groups;
}

/**
 * Selects a url from the SERP using two characteristics of SEPRS:
 * -results are identically styled
 * -the image of a result should not appear multiple times in the page
 *
 */
function getImageFromSERP(dom) {
  const styleGroups = groupImagesByStyle(dom);
  let image;
  let maxValue = 0;
  // Filter out images that repeat multiple times
  Object.keys(styleGroups).filter(key =>
    (styleGroups[key].count / styleGroups[key].images.size) < 2)
    .forEach((key) => {
      if (styleGroups[key].count > maxValue) {
        maxValue = styleGroups[key].count;
        image = styleGroups[key].firstImage;
      }
    });
  // Website use this pattern to resize images
  // Safe for the specific cases enabled here but should be rethought
  image = image.split('$')[0];
  return image;
}

function addCampaignParams(searchUrl, ctaUrl) {
  const sUrl = new URL(searchUrl);
  const cUrl = new URL(ctaUrl);
  if (sUrl.hostname === cUrl.hostname) {
    for (const param of cUrl.searchParams.entries()) {
      sUrl.searchParams.append(param[0], param[1]);
    }
  }
  return sUrl.toString();
}


async function getDynamicContent(offer, urlData, catMatches) {
  try {
    if (!offer.shouldShowDynamicOffer()) {
      return offer;
    }
    const key = offer.offerObj.categories.find(cat => catMatches.matches.has(cat));
    const query = _guessQuery(urlData.getNormalizedUrl(), catMatches.matches.get(key)[0]);
    if (!query) {
      logger.log('_guessQuery: No query found for', urlData.getNormalizedUrl(), catMatches.matches.get(key)[0]);
      return offer;
    }
    logger.log(`_guessQuery: "${query}" found for url: ${urlData.getNormalizedUrl()} and pattern: ${catMatches.matches.get(key)[0]}`);

    const searchUrl = getSearchUrl(query, offer.offerObj.monitorData);
    if (!searchUrl) {
      logger.log('getSearchUrl: No searchUrlTemplate for offer:', offer.offerObj);
      return offer;
    }

    const { htmlContent, mimeType } = await performSearch(searchUrl);
    if (!htmlContent) {
      logger.log(`performSearch: ${searchUrl} failed`);
      return offer;
    }
    logger.log(`performSearch: ${searchUrl} fetched`);

    const { pageText, dom } = parseHtml(htmlContent, mimeType);
    if (!pageText || !dom) {
      logger.log(`parseHtml: ${searchUrl} failed`);
      return offer;
    }
    logger.log(`parseHtml: ${searchUrl} parsed`);


    const resultsCount = _getResultCountFromText(pageText, query);
    logger.log(`_getResultCountFromText: ${resultsCount} results found`);

    // A minimum number of results is expected for the image extracting
    // heuristic to work
    if (resultsCount > MINIMUM_RESULT_COUNT) {
      const imageUrl = getImageFromSERP(dom);
      logger.log(`getImageFromSERP: found ${imageUrl}`);
      offer.setDynamicContent((new URL(imageUrl, searchUrl)).toString(),
        addCampaignParams(searchUrl, offer.offerObj.ui_info.template_data.call_to_action.url));
      return offer;
    }
    return offer;
  } catch (e) {
    logger.error(e);
    return offer;
  }
}

export {
  _guessQuery,
  _getResultCountFromText,
  getDynamicContent
};
