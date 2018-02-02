import { expect } from '../helpers';

export default function (result, element, urlbartext, urlbar) {
  expect(element).to.have.class('selected');
  expect(result.querySelectorAll('.selected')).to.have.length(1);
  expect(urlbar.textValue).to.equal(urlbartext);
}
