export default [
  {
    url: 'https://www.lotto.de/de/ergebnisse/lotto-6aus49/lottozahlen.html',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: 'Glücksspirale',
              url: 'https://www.lotto.de/de/ergebnisse/gluecksspirale/gluecksspirale-gewinnzahlen.html'
            },
            {
              title: 'Keno',
              url: 'https://www.lotto.de/de/ergebnisse/keno/kenozahlen.html'
            },
            {
              title: 'EuroJackpot',
              url: 'https://www.lotto.de/de/ergebnisse/eurojackpot/eurojackpot-zahlen.html'
            }
          ],
          type: 'buttons'
        }
      ],
      description: 'Description: Aktuelle Lottozahlen und Lottoquoten der Ziehung von LOTTO...',
      extra: {
        lotto_list: {
          cur_date: {
            date: '2017-07-19',
            lotto: {
              gewinnzahlen: [
                '17',
                '19',
                '21',
                '27',
                '36',
                '41'
              ],
              spieleinsatz: '24896836.00',
              superzahl: '1',
              waehrung: 'EUR',
              zusatzzahl: null
            },
            spiel77: {
              gewinnzahlen: '0177997',
              spieleinsatz: '5100027.50',
              waehrung: 'EUR'
            },
            super6: {
              gewinnzahlen: '422100',
              spieleinsatz: '2176462.50',
              waehrung: 'EUR'
            },
            year: 2017
          }
        },
        lotto_type: '6aus49'
      },
      friendlyUrl: 'lotto.de/de/ergebnisse/lotto-6aus49/lottozahlen.html',
      title: 'Lotto 6 aus 49'
    },
    type: 'rh',
    subType: {
      class: 'EntityLotto',
      id: '-5001137949554477336',
      name: 'Lotto6aus49Impl'
    },
    template: 'lotto',
    trigger_method: 'query'
  }
];
