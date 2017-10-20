/* global it, expect, respondWith, fillIn, waitForPopup, $cliqzResults, withHistory, CliqzUtils */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

export default function () {
  context('offers', function () {
    const results = [
      {
        url: 'https://www.happycar.de',
        score: 0,
        snippet: {
          description: 'Günstige Mietwagen weltweit finden Sie bei HAPPYCAR. Wir vergleichen die Angebote aller Autovermietungen. Sparen Sie bis zu 60% bei der Buchung mit unserem Vergleichsportal!',
          extra: {
            is_ad: true,
            offers_data: {
              data: {
                action_info: {},
                campaign_id: 'HCL1',
                display_id: 'HCL1Dd1_D',
                filter_info: {},
                offer_id: 'HCL1Dd1',
                rs_dest: [
                  'dropdown'
                ],
                rule_info: {},
                ui_info: {}
              },
            },
            url_ad: 'https://www.happycar.de/?utm_source=cliqz\u0026utm_medium=referral\u0026utm_campaign=Cliqz_Camp1\u0026utm_content=drpdwn'
          },
          friendlyUrl: 'happycar.de',
          title: 'Mietwagen und Autovermietung im Preisvergleich | HAPPYCAR'
        },
        type: 'rh',
        subType: {
          class: 'EntityKPI',
          id: '1978220978247442723',
          name: 'CarRentalAd:europcar.de'
        },
        template: 'generic',
        trigger_method: 'url'
      }
    ];

    let resultElement;
    let offerElement;

    before(function () {
      CliqzUtils.setPref('offersDropdownSwitch', true);
      respondWith({ results });
      withHistory([]);
      fillIn('mietwagen');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
        offerElement = resultElement.querySelector('a.result:not(.search)');
      });
    });

    it('renders title', function () {
      const titleSelector = '.title';
      expect(offerElement).to.contain(titleSelector);
      expect(offerElement.querySelector(titleSelector).textContent.trim())
        .to.equal(results[0].snippet.title);
    });

    it('renders divider', function () {
      const dividerSelector = '.divider';
      expect(offerElement).to.contain(dividerSelector);
      expect(offerElement.querySelector(dividerSelector).textContent.trim()).to.equal('—');
    });

    it('renders url', function () {
      const urlSelector = '.url';
      expect(offerElement).to.contain(urlSelector);
      expect(offerElement.querySelector(urlSelector).textContent.trim())
        .to.equal(results[0].snippet.friendlyUrl);
    });

    it('renders description', function () {
      const descriptionSelector = '.description';
      expect(offerElement).to.contain(descriptionSelector);
      expect(offerElement.querySelector(descriptionSelector).textContent.trim())
        .to.equal(results[0].snippet.description);
    });

    it('renders "Anzeige"', function () {
      const adSelector = '.ad';
      expect(offerElement).to.contain(adSelector);
      expect(offerElement.querySelector(adSelector).textContent.trim()).to.equal('Anzeige');
    });

    it('renders logo', function () {
      const logoSelector = ".icons span[class='logo']";
      expect(resultElement).to.contain(logoSelector);
    });

    it('url is correct', function () {
      expect(offerElement.href).to.equal(results[0].snippet.extra.url_ad);
    });
  });
}
