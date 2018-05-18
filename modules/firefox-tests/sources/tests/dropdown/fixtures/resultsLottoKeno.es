export default [
  {
    url: 'https://www.lotto.de/de/ergebnisse/keno/kenozahlen.html',
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
              title: '6aus49',
              url: 'https://www.lotto.de/de/ergebnisse/lotto-6aus49/lottozahlen.html'
            },
            {
              title: 'EuroJackpot',
              url: 'https://www.lotto.de/de/ergebnisse/eurojackpot/eurojackpot-zahlen.html'
            }
          ],
          type: 'buttons'
        }
      ],
      description: 'Täglich aktuelle Kenozahlen und Quoten der letzten Ziehungen...',
      extra: {
        lotto_list: {
          cur_date: {
            date: '2017-07-19',
            keno: {
              gewinnzahlen: [
                '2',
                '9',
                '12',
                '15',
                '16',
                '17',
                '20',
                '27',
                '33',
                '37',
                '38',
                '40',
                '45',
                '52',
                '53',
                '55',
                '58',
                '60',
                '67',
                '70'
              ],
              spieleinsatz: null,
              waehrung: 'EUR'
            },
            kw: 30,
            plus5: {
              gewinnzahlen: '45681'
            },
            year: 2017
          }
        },
        lotto_type: 'keno'
      },
      friendlyUrl: 'lotto.de/de/ergebnisse/keno/kenozahlen.html',
      title: 'KENO spielen, Gewinnzahlen, Quoten...'
    },
    type: 'rh',
    subType: {
      class: 'EntityLotto',
      id: '-9214692131128402095',
      name: 'LottoKenoImpl'
    },
    template: 'lotto',
    trigger_method: 'query'
  }
];
