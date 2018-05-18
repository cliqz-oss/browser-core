import inject from '../core/kord/inject';
import getWindowApi from '../core/window-api';

const core = inject.module('core');

function getHTML(originalURL) {
  return core.action('getHTML', originalURL).then((docs) => {
    const doc = docs[0];
    if (doc) {
      return doc;
    }
    throw new Error(`Failed to get content for tab with url=${originalURL}`);
  });
}

export function parseHtml(html) {
  if (!parseHtml.domParser) {
    parseHtml.domParser = getWindowApi().then(wAPI => new wAPI.DOMParser());
  }

  return parseHtml.domParser
    .then(domParser => domParser.parseFromString(html, 'text/html'));
}

/**
 * @param originalURL  URL as seen by the browser
 */
export function getContentDocument(originalURL) {
  return getHTML(originalURL).then(parseHtml);
}
