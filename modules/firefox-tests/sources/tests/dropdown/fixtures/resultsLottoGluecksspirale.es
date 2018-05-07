export default [
  {
    url: 'https://www.lotto.de/de/ergebnisse/gluecksspirale/gluecksspirale-gewinnzahlen.html',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: 'Keno',
              url: 'https://www.lotto.de/de/ergebnisse/keno/kenozahlen.html'
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
      description: 'Aktuelle GlücksSpirale - Gewinnzahlen und Quoten der letzten Ziehungen',
      extra: {
        lotto_list: {
          cur_date: {
            date: '2017-07-19',
            gs: {
              gewinnzahlen: [
                '2',
                '12',
                '378',
                '4980',
                '23646',
                [
                  '446827',
                  '901252'
                ],
                [
                  '1551644',
                  '2517735'
                ]
              ],
              spieleinsatz: null,
              waehrung: 'EUR'
            },
            year: 2017
          }
        },
        lotto_type: 'glueckspirale'
      },
      friendlyUrl: 'lotto.de/de/ergebnisse/gluecksspirale/gluecksspirale-gewinnzahlen.html',
      title: 'Glücksspirale spielen, Gewinnzahlen, Quoten...'
    },
    type: 'rh',
    subType: {
      class: 'EntityLotto',
      id: '-1311297497328375090',
      name: 'LottoGluecksspiraleImpl'
    },
    template: 'lotto',
    trigger_method: 'query'
  }
];

export const lottoResults = [
  {
    url: 'https://www.lotto.de/de/ergebnisse/gluecksspirale/gluecksspirale-gewinnzahlen.html',
    score: 0,
    snippet: {
      description: 'Aktuelle GlücksSpirale - Gewinnzahlen und Quoten der letzten Ziehungen',
      extra: {
        lotto_list: {
          cur_date: {
            date: '2017-07-15',
            gs: {
              gewinnzahlen: [
                '2',
                '12',
                '378',
                '4980',
                '23646',
                [
                  '446827',
                  '901252'
                ],
                [
                  '1551644',
                  '2517735'
                ]
              ],
              spieleinsatz: null,
              waehrung: 'EUR'
            },
            year: 2017
          }
        },
        lotto_type: 'glueckspirale'
      },
      friendlyUrl: 'lotto.de/de/ergebnisse/gluecksspirale/gluecksspirale-gewinnzahlen.html',
      title: 'Glücksspirale spielen, Gewinnzahlen, Quoten...'
    },
    type: 'rh',
    subType: {
      class: 'EntityLotto',
      id: '-1311297497328375090',
      name: 'LottoGluecksspiraleImpl'
    },
    template: 'lotto',
    trigger_method: 'query'
  }
];
