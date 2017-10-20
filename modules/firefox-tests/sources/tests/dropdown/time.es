/* global it, expect, chai, respondWith, fillIn, waitForPopup,
$cliqzResults, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a time result', function () {
    const results = [
      {
        url: 'http://worldtime.io/current/WzUyLjUxNjcsIDEzLjRdfDEzLjR8NTIuNTE2Nw%3D%3D',
        score: 0,
        snippet: {
          extra: {
            answer: '14:10',
            expression: 'Freitag, 29. September 2017',
            ez_type: 'time',
            is_calculus: true,
            line3: 'Central European Summer Time (UTC/GMT +2:00)',
            location: 'Berlin',
            mapped_location: 'Berlin, Deutschland',
            meta: {
              lazyRH_: '0.00316095352173'
            },
            prefix_answer: '',
            support_copy_ans: null
          },
          friendlyUrl: 'worldtime.io/current/wzuyljuxnjcsidezljrdfdezljr8ntiunte2nw%3d%3d'
        },
        type: 'rh',
        subType: {
          class: 'EntityTime',
          id: '6476544153365272821',
          name: 'time zone'
        },
        template: 'calculator',
        trigger_method: 'query'
      },


    ];
    const timeSelector = 'div.time p';
    let timeItems;
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('time berlin');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
        timeItems = resultElement.querySelectorAll(timeSelector);
      });
    });

    it('renders the main result', function () {
      chai.expect(timeItems[0]).to.exist;
    });

    it('renders the main result with correct time', function () {
      chai.expect(timeItems[0]).to.contain.text(results[0].snippet.extra.answer);
    });

    it('renders the main result with correct location', function () {
      chai.expect(timeItems[0]).to.contain.text(results[0].snippet.extra.mapped_location);
    });

    it('renders the caption line', function () {
      chai.expect(timeItems[1]).to.exist;
    });

    it('renders the caption line with correct date', function () {
      chai.expect(timeItems[1]).to.contain.text(results[0].snippet.extra.expression);
    });

    it('renders the caption line with correct time zone', function () {
      chai.expect(timeItems[1]).to.contain.text(results[0].snippet.extra.line3);
    });

    it('renders the caption line with "Source" label', function () {
      chai.expect(timeItems[1]).to.contain.text('Source:');
    });

    it('renders the caption line with correct "Source" link', function () {
      chai.expect(timeItems[1]).to.contain.text('worldtime.io');
    });

    it('renders the caption line with correct URL', function () {
      chai.expect(timeItems[1].querySelector('a.source-link').href.toLowerCase())
        .to.contain(results[0].snippet.friendlyUrl);
    });
  });
}
