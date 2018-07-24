import { expect, urlbar, $cliqzResults } from '../helpers';

export default function (element, urlBarText) {
  expect(element).to.have.class('selected');
  expect($cliqzResults.querySelectorAll('.selected')).to.have.length(1);
  return expect(urlbar.mInputField.value).to.equal(urlBarText);
}
