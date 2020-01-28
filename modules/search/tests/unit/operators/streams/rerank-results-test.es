/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const mock = {
  'search/operators/normalize': {
    getMainLink: ({ links }) => links[0],
  },
  'search/providers/cliqz': {},
};

export default describeModule('search/operators/responses/rerank',
  () => mock,
  () => {
    describe('#decrease', function () {
      let decrease;

      beforeEach(function () {
        decrease = this.module().default;
      });

      it('does not decrease anything', function () {
        const results = [
          {
            links:
            [
              {
                url: 'https://www.google.com/search?q=simple++&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                href: 'https://www.google.com/search?q=simple++&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                friendlyUrl: 'google.com/search?q=simple++&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                extra: {
                  searchEngineName: 'Google'
                },
                kind: ['default-search'],
                provider: 'instant',
                suggestion: 'simple  ',
                text: 'simple  ',
                type: 'supplementary-search',
                meta: {
                  level: 0,
                  type: 'main',
                  domain: 'google.com',
                  host: 'google.com',
                  hostAndPort: 'google.com',
                  port: '',
                  url: 'google.com/search?q=simple++&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                  subType: {
                  }
                }
              }
            ]
          },
          {
            links:
            [
              {
                url: 'https://www.englisch-hilfen.de/grammar/sim_past.htm',
                href: 'https://www.englisch-hilfen.de/grammar/sim_past.htm',
                friendlyUrl: 'englisch-hilfen.de/grammar/sim_past.htm',
                title: 'Simple Past - Regeln und Beispiele',
                description: 'Das Simple Past im Englischen mit Erklärungen zur Bildung der Zeitform und Beispielen',
                extra: {
                  alternatives: [
                    'https://www.englisch-hilfen.de/grammar/sim_past.htm'
                  ],
                  language: {
                    de: '.8100000023841858'
                  }
                },
                kind: [
                  'm'
                ],
                provider: 'cliqz',
                text: 'simple  ',
                type: 'bm',
                meta: {
                  level: 0,
                  type: 'main',
                  domain: 'englisch-hilfen.de',
                  host: 'englisch-hilfen.de',
                  hostAndPort: 'englisch-hilfen.de',
                  port: '',
                  url: 'englisch-hilfen.de/grammar/sim_past.htm',
                  score: '721',
                  subType: {
                  },
                  completion: '',
                }
              }
            ]
          },
          {
            links:
            [
              {
                url: 'https://www.ego4u.de/de/cram-up/grammar/simple-past',
                href: 'https://www.ego4u.de/de/cram-up/grammar/simple-past',
                friendlyUrl: 'ego4u.de/de/cram-up/grammar/simple-past',
                title: 'Simple Past',
                description: 'Simple Past (Präteritum, einfache Vergangenheit), Kurzerläuterung und Übungen',
                extra: {
                  alternatives: [
                    'https://www.ego4u.de/de/cram-up/grammar/simple-past'
                  ],
                  language: {
                    de: 0.699999988079071
                  }
                },
                kind: [
                  'm'
                ],
                provider: 'cliqz',
                text: 'simple  ',
                type: 'bm',
                meta: {
                  level: 0,
                  type: 'main',
                  domain: 'ego4u.de',
                  host: 'ego4u.de',
                  hostAndPort: 'ego4u.de',
                  port: '',
                  url: 'ego4u.de/de/cram-up/grammar/simple-past',
                  score: 5694,
                  subType: {
                  },
                  completion: '',
                }
              }
            ]
          },
          {
            links: [
              {
                url: 'http://www.dalango.de/grammatik/simple-past-englische-grammatik ',
                href: 'http://www.dalango.de/grammatik/simple-past-englische-grammatik ',
                friendlyUrl: 'dalango.de/grammatik/simple-past-englische-grammatik ',
                title: 'Simple past verständlich und anschaulich erklärt | dalango ',
                description: 'Finde hier eine anschauliche Erklärung zur Bildung und Verwendung des Simple Past im Englischen. Alle Informationen zur Bildung und dessen Ausnahmen. ',
                extra: {
                  alternatives: [
                  ],
                  language: {
                    de: 0.8600000143051147
                  }
                },
                kind: [
                  'm'
                ],
                provider: 'cliqz',
                text: 'simple   ',
                type: 'bm ',
                meta: {
                  level: 0,
                  type: 'main ',
                  domain: 'dalango.de',
                  host: 'dalango.de',
                  hostAndPort: 'dalango.de',
                  port: ' ',
                  url: 'dalango.de/grammatik/simple-past-englische-grammatik ',
                  score: 2496,
                  subType: {
                  },
                  completion: '',
                }
              }
            ]
          }
        ];

        const decreased = decrease({ results });
        chai.expect(decreased).to.deep.equal({ results });
      });

      describe('#overview results', function () {
        it('enriches only first overview result', function () {
          const results = [
            {
              links:
              [
                {
                  type: 'supplementary-search',
                  meta: {
                    level: 0,
                    type: 'main',
                    domain: 'google.com',
                    host: 'google.com',
                    hostAndPort: 'google.com',
                    port: '',
                    url: 'google.com/search?q=simple++&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                    subType: {
                    }
                  }
                }
              ]
            },
            {
              links: [
                {
                  template: 'lotto',
                  type: 'rh',
                  meta: {
                    level: 0,
                    type: 'main',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                }
              ]
            },
            {
              links: [
                {
                  template: 'entity-news-1',
                  type: 'rh',
                  meta: {
                    level: 0,
                    type: 'main',
                  },
                  kind: []
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                }
              ]
            }
          ];

          const decreased = decrease({ results });
          const expected = [
            {
              links:
              [
                {
                  type: 'supplementary-search',
                  meta: {
                    level: 0,
                    type: 'main',
                    domain: 'google.com',
                    host: 'google.com',
                    hostAndPort: 'google.com',
                    port: '',
                    url: 'google.com/search?q=simple++&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                    subType: {
                    }
                  }
                }
              ]
            },
            {
              links: [
                {
                  template: 'lotto',
                  type: 'rh',
                  meta: {
                    level: 0,
                    type: 'main',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                }
              ]
            },
            {
              links: [
                {
                  template: 'generic',
                  type: 'rh',
                  meta: {
                    level: 0,
                    type: 'main',
                  },
                  kind: []
                },
              ]
            }
          ];
          chai.expect(decreased).deep.equal({ results: expected });
        });

        it('removes extra data from second overview result', function () {
          const results = [
            {
              links:
              [
                {
                  type: 'supplementary-search',
                  meta: {
                    level: 0,
                    type: 'main',
                    domain: 'google.com',
                    host: 'google.com',
                    hostAndPort: 'google.com',
                    port: '',
                    url: 'google.com/search?q=simple++&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                    subType: {
                    }
                  }
                }
              ]
            },
            {
              links: [
                {
                  template: 'entity-news-1',
                  type: 'rh',
                  meta: {
                    level: 0,
                    type: 'main',
                  },
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                }
              ]
            },
            {
              links: [
                {
                  template: 'lotto',
                  type: 'rh',
                  meta: {
                    level: 0,
                    type: 'main',
                  },
                  kind: [],
                  extra: {
                    last_updated: 1523727657.2642317,
                    lotto_list: {
                      '2018-04-14': {
                        date: '2018-04-14',
                        lotto: {
                          gewinnzahlen: [
                            '4',
                            '9',
                            '33',
                            '34',
                            '42',
                            '47'
                          ],
                          spieleinsatz: null,
                          superzahl: '6',
                          waehrung: 'EUR',
                          zusatzzahl: null
                        },
                        spiel77: {
                          gewinnzahlen: '0034422',
                          spieleinsatz: null,
                          waehrung: 'EUR'
                        },
                        super6: {
                          gewinnzahlen: '646783',
                          spieleinsatz: null,
                          waehrung: 'EUR'
                        },
                        year: '2018'
                      }
                    },
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                }
              ]
            },
          ];

          const decreased = decrease({ results });
          const expected = [
            {
              links:
              [
                {
                  type: 'supplementary-search',
                  meta: {
                    level: 0,
                    type: 'main',
                    domain: 'google.com',
                    host: 'google.com',
                    hostAndPort: 'google.com',
                    port: '',
                    url: 'google.com/search?q=simple++&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                    subType: {
                    }
                  }
                }
              ]
            },
            {
              links: [
                {
                  template: 'entity-news-1',
                  type: 'rh',
                  meta: {
                    level: 0,
                    type: 'main',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'news',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                },
                {
                  meta: {
                    level: 1,
                    type: 'buttons',
                  }
                }
              ]
            },
            {
              links: [
                {
                  template: 'generic',
                  type: 'rh',
                  meta: {
                    level: 0,
                    type: 'main',
                  },
                  kind: []
                }
              ]
            },
          ];

          chai.expect(decreased).deep.equal({ results: expected });
        });
      });

      describe('#supplementary results', function () {
        context('#generic result with supplementary search', function () {
          it('does not decrease supplementary result if it appears on first position after supplementary search', function () {
            const results = [
              {
                links: [
                  {
                    url: 'https://www.google.com/search?q=rewe&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                    type: 'supplementary-search',
                  }
                ]
              },
              {
                links: [
                  {
                    url: 'https://www.rewe.de/',
                    extra: {
                      alternatives: [
                        'https://www.rewe.de/'
                      ],
                      language: {
                        de: 0.9900000095367432
                      },
                      no_location: true,
                      superTemplate: 'local-data-sc'
                    },
                    kind: [
                      'X|{"class":"EntityLocal"}'
                    ],
                    template: 'generic',
                    type: 'rh',
                  },
                  {
                    url: 'https://www.rewe.de/angebote/',
                  },
                  {
                    url: 'https://www.rewe.de/service/online-einkaufen/',
                  },
                  {
                    url: 'https://www.rewe.de/aktionen/gewinnspiele/',
                  },
                  {
                    url: 'https://www.rewe.de/aktionen/',
                  },
                ]
              },
              {
                links: [
                  {
                    url: 'https://shop.rewe.de/',
                    type: 'bm',
                    meta: {},
                  }
                ]
              },
              {
                links: [
                  {
                    url: 'https://shop.rewe.de/productList?discount=',
                    type: 'bm',
                    meta: {},
                  }
                ]
              }
            ];

            const decreased = decrease({ results });

            chai.expect(decreased).deep.equal({ results });
          });

          it('does not decrease supplementary search if no other rich results appears', function () {
            const results = [
              {
                links: [
                  {
                    url: 'https://www.google.com/search?q=rewe&ie=utf-8&oe=utf-8&client=firefox-b-ab',
                    type: 'supplementary-search',
                    meta: {},
                  }
                ]
              },
              {
                links: [
                  {
                    url: 'https://shop.rewe.de/',
                    type: 'bm',
                    meta: {},
                  }
                ]
              },
              {
                links: [
                  {
                    url: 'https://www.rewe.de/',
                    extra: {
                      alternatives: [
                        'https://www.rewe.de/'
                      ],
                      language: {
                        de: 0.9900000095367432
                      },
                      no_location: true,
                      superTemplate: 'local-data-sc'
                    },
                    kind: [
                      'X|{"class":"EntityLocal"}'
                    ],
                    template: 'generic',
                    type: 'rh',
                    meta: {},
                  },
                  {
                    url: 'https://www.rewe.de/angebote/',
                    meta: {},
                  },
                  {
                    url: 'https://www.rewe.de/service/online-einkaufen/',
                    meta: {},
                  },
                  {
                    url: 'https://www.rewe.de/aktionen/gewinnspiele/',
                    meta: {},
                  },
                  {
                    url: 'https://www.rewe.de/aktionen/',
                    meta: {},
                  },
                ]
              },
            ];

            const expected = results;
            const decreased = decrease({ results });

            chai.expect(decreased).deep.equal({ results: expected });
          });
        });


        context('#generic result with no supplementary search', function () {
          it('does not decrease supplementary result if it appears on first position', function () {
            const results = [
              {
                links: [
                  {
                    url: 'https://www.rewe.de/',
                    extra: {
                      alternatives: [
                        'https://www.rewe.de/'
                      ],
                      language: {
                        de: 0.9900000095367432
                      },
                      no_location: true,
                      superTemplate: 'local-data-sc'
                    },
                    kind: [
                      'X|{"class":"EntityLocal"}'
                    ],
                    template: 'generic',
                    type: 'rh',
                  },
                  {
                    url: 'https://www.rewe.de/angebote/',
                  },
                  {
                    url: 'https://www.rewe.de/service/online-einkaufen/',
                  },
                  {
                    url: 'https://www.rewe.de/aktionen/gewinnspiele/',
                  },
                  {
                    url: 'https://www.rewe.de/aktionen/',
                  },
                ]
              },
              {
                links: [
                  {
                    url: 'https://shop.rewe.de/productList?discount=',
                    type: 'bm',
                  }
                ]
              },
            ];

            const expected = results;
            const decreased = decrease({ results });

            chai.expect(decreased).deep.equal({ results: expected });
          });

          // it('decreases supplementary search if it appears on second position', function () {
          //   const results = [
          //     {
          //       links: [
          //         {
          //           url: 'https://shop.rewe.de/productList?discount=',
          //           type: 'bm',
          //         }
          //       ]
          //     },
          //     {
          //       links: [
          //         {
          //           url: 'https://www.rewe.de/',
          //           extra: {
          //             alternatives: [
          //               'https://www.rewe.de/'
          //             ],
          //             language: {
          //               de: 0.9900000095367432
          //             },
          //             no_location: true,
          //             superTemplate: 'local-data-sc'
          //           },
          //           kind: [
          //             'X|{"class":"EntityLocal"}'
          //           ],
          //           template: 'generic',
          //           type: 'rh',
          //         },
          //         {
          //           url: 'https://www.rewe.de/angebote/',
          //         },
          //         {
          //           url: 'https://www.rewe.de/service/online-einkaufen/',
          //         },
          //         {
          //           url: 'https://www.rewe.de/aktionen/gewinnspiele/',
          //         },
          //         {
          //           url: 'https://www.rewe.de/aktionen/',
          //         },
          //       ]
          //     },
          //   ];
          // });
        });
      });
    });
  });
