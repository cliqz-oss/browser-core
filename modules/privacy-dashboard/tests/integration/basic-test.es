import {
  expect,
  getMessage,
  getResourceUrl,
  newTab,
  queryHTML,
  waitFor,
  waitForElement,
} from '../../../tests/core/integration/helpers';

export default function () {
  describe('Transparency monitor', function () {
    const transparencyUrl = getResourceUrl('privacy-dashboard/index.html');
    const uiElementsToCheck = [
      { name: 'side panel title', selector: 'transparency_document_title' },
      { name: 'side panel "Legend" label', selector: 'transparency_legend_title' },
      { name: 'side panel "Blocked" label', selector: 'transparency_blocked1' },
      { name: 'side panel "Received" label', selector: 'transparency_blocked2' },
      { name: 'main header', selector: 'transparency_content_title' },
      { name: 'transparency message', selector: 'transparency_content' },
      { name: 'antitracking header', selector: 'transparency_search_title' },
      { name: 'antitracking message', selector: 'transparency_search_content' },
      { name: 'Human Web header', selector: 'transparency_humanweb_title' },
      { name: 'Human Web message', selector: 'transparency_humanweb_content' },
      { name: 'telemetry header', selector: 'transparency_telemetry_title' },
      { name: 'telemetry message', selector: 'transparency_telemetry_content' },
    ];
    const dataElementsToCheck = [
      { name: 'search activity', selector: '#searchData' },
      { name: 'Human Web activity', selector: '#humanwebData' },
      { name: 'telemetry activity', selector: '#telemetryData' },
    ];
    const dataItemSelector = '.item';
    let transparencyShown;

    beforeEach(async function () {
      await newTab(transparencyUrl, { focus: true });
      transparencyShown = await waitForElement({
        url: transparencyUrl,
        selector: '[data-i18n="transparency_content_title"]',
        isPresent: true
      });
    });

    describe('renders', function () {
      it('successfully', function () {
        expect(transparencyShown).to.be.true;
      });

      uiElementsToCheck.forEach((element) => {
        it(`with correct ${element.name}`, async function () {
          const i18nText = new DOMParser().parseFromString(getMessage(element.selector), 'text/html');
          expect(i18nText.children).to.have.length(1);

          await waitFor(
            async () => {
              const $el = await queryHTML(transparencyUrl, `[data-i18n=${element.selector}]`, 'textContent');
              expect($el).to.have.length(1);
              return expect($el[0]).to.equal(i18nText.children[0].textContent);
            },
            2000
          );
        });
      });

      dataElementsToCheck.forEach((element) => {
        it(`with existing ${element.name} data`, async function () {
          const dataSelector = element.selector;
          const $dataContainer = await queryHTML(transparencyUrl, dataSelector, 'textContent');

          expect($dataContainer).to.have.length(1);

          await waitFor(
            async () => {
              const $dataElements = await queryHTML(transparencyUrl, `${dataSelector} ${dataItemSelector}`, 'textContent');
              expect($dataElements).to.have.length.above(0);
              if ($dataElements.length === 1) {
                return expect($dataElements[0]).to.contain(getMessage('transparency_activity_buttons'));
              }
              return true;
            },
            2000
          );
        });
      });
    });
  });
}
