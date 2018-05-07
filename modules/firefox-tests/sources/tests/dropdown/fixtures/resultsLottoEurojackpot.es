export default [
  {
    url: 'https://www.lotto.de/de/ergebnisse/eurojackpot/eurojackpot-zahlen.html',
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
              title: '6aus49',
              url: 'https://www.lotto.de/de/ergebnisse/lotto-6aus49/lottozahlen.html'
            }
          ],
          type: 'buttons'
        }
      ],
      description: 'Eurojackpot - aktuelle Gewinnzahlen, Quoten. Mit Eurojackpot jede Woche die Chance auf 10 Mio...',
      extra: {
        lotto_list: {
          cur_date: {
            date: '2017-07-19',
            ej: {
              gewinnzahlen: [
                '3',
                '9',
                '25',
                '31',
                '49'
              ],
              spieleinsatz: '28996288.00',
              waehrung: 'EUR',
              zwei_aus_acht: [
                '8',
                '9'
              ]
            },
            year: 2017
          }
        },
        lotto_type: 'eurojackpot'
      },
      friendlyUrl: 'lotto.de/de/ergebnisse/eurojackpot/eurojackpot-zahlen.html',
      title: 'Eurojackpot spielen, Gewinnzahlen, Quoten...'
    },
    type: 'rh',
    subType: {
      class: 'EntityLotto',
      id: '8851888541864181536',
      name: 'LottoEurojackpotImpl'
    },
    template: 'lotto',
    trigger_method: 'query'
  }
];
