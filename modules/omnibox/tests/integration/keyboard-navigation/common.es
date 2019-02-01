import { expect, urlbar, $cliqzResults } from '../helpers';

export async function expectSelection(selector, urlBarText) {
  expect(await $cliqzResults.querySelector(selector)).to.have.class('selected');
  expect(await $cliqzResults.querySelectorAll('.selected')).to.have.length(1);
  return expect(await urlbar.textValue).to.equal(urlBarText);
}

export function visibleValue(url) {
  let visibleUrl = url.startsWith('http:') ? url.slice(7) : url;
  visibleUrl = visibleUrl.endsWith('/') ? visibleUrl.slice(0, -1) : visibleUrl;
  return visibleUrl;
}
