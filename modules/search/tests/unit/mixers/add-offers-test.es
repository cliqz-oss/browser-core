/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global describeModule, chai */
const Rx = require('rxjs');
const operators = require('rxjs/operators');

const mock = {
  rxjs: Rx,
  'rxjs/operators': operators,
  'search/operators/normalize': {
    getMainLink: ({ links }) => links[0],
  },
  'core/url': {
    strip: x => x,
  },
};

export default describeModule('search/mixers/add-offers',
  () => mock,
  () => {
    describe('#addOffer', function () {
      let addOffer;
      const results = [
        {
          links: [{ url: 'cliqz.com', meta: {} }],
        },
        {
          links: [{ url: 'ghostery.com', meta: {} }],
        },
      ];

      beforeEach(function () {
        addOffer = this.module().addOffer;
      });

      it('injects offer as first result', function () {
        const offer = {
          links: [
            {
              extra: {
                has_injection: false,
              },
              meta: {

              }
            },
          ],
        };
        const config = {
          operators: {
            offers: {
              position: 'first',
              isEnabled: true,
            },
          }
        };
        const expected = [offer, ...results];
        chai.expect(
          addOffer(results, offer, config)
        ).to.deep.equal(expected);
      });

      it('injects offer as last result', function () {
        const offer = {
          links: [
            {
              extra: {
                has_injection: false,
              }
            },
          ],
        };
        const config = {
          operators: {
            offers: {
              position: 'last',
              isEnabled: true,
            },
          }
        };
        const expected = [...results, offer];
        chai.expect(
          addOffer(results, offer, config)
        ).to.deep.equal(expected);
      });
    });

    describe('#attachOffer', function () {
      let attachOffer;
      let results = [
        {
          links: [{ url: 'audible.com' }],
        },
        {
          links: [{ url: 'ghostery.com' }],
        },
      ];

      beforeEach(function () {
        attachOffer = this.module().attachOffer;
      });

      it('injects offer to result that comes from rich header and matches the injected id', function () {
        const config = {
          operators: {
            offers: {
              isEnabled: true,
              locationEnabled: true,
            }
          }
        };

        const offer = {
          links: [
            {
              extra: {
                offers_data: {
                  data: {
                    display_id: 'AudibleBoxTG3O2_D',
                    campaign_id: 'AudibleBox',
                    rs_dest: [
                      'dropdown'
                    ],
                    offer_id: 'AudibleBox_TG3_O2_V1'
                  },
                  promo_code: 'nicht benötigt',
                  thumbnail: 'http://cdn.cliqz.com/extension/rh-offers/Audible/74/image.png'
                },
                has_injection: true,
                injected_ids: {
                  'audible.de': {
                    type: 'domain'
                  }
                }
              }
            },
          ],
        };

        results = [
          {
            links: [
              {
                url: 'https://www.audible.de/',
                meta: {
                  domain: 'audible.de'
                },
                type: 'rh'
              }
            ],
          },
          {
            links: [
              {
                url: 'https://www.ghostery.com',
                meta: {
                  domain: 'ghostery.com'
                }
              }
            ],
          },
        ];

        const expected = [
          {
            links: [
              {
                url: 'https://www.audible.de/',
                meta: {
                  domain: 'audible.de'
                },
                type: 'rh',
                extra: {
                  offers_data: {
                    is_injected: true,
                    data: {
                      display_id: 'AudibleBoxTG3O2_D',
                      campaign_id: 'AudibleBox',
                      rs_dest: [
                        'dropdown'
                      ],
                      offer_id: 'AudibleBox_TG3_O2_V1'
                    },
                    promo_code: 'nicht benötigt',
                    thumbnail: 'http://cdn.cliqz.com/extension/rh-offers/Audible/74/image.png'
                  },
                }
              }
            ]
          },
          {
            links: [
              {
                url: 'https://www.ghostery.com',
                meta: {
                  domain: 'ghostery.com'
                }
              }
            ],
          },
        ];

        chai.expect(attachOffer(results, offer, config)).to.deep.equal(expected);
      });

      it('injects offer only to first mathcing domain', function () {
        const config = {
          operators: {
            offers: {
              isEnabled: true,
              locationEnabled: true,
            }
          }
        };
        const offer = {
          links: [
            {
              extra: {
                offers_data: {
                  data: {
                    display_id: 'AudibleBoxTG3O2_D',
                    campaign_id: 'AudibleBox',
                    rs_dest: [
                      'dropdown'
                    ],
                    offer_id: 'AudibleBox_TG3_O2_V1'
                  },
                  promo_code: 'nicht benötigt',
                  thumbnail: 'http://cdn.cliqz.com/extension/rh-offers/Audible/74/image.png'
                },
                has_injection: true,
                injected_ids: {
                  'audible.de': {
                    type: 'domain'
                  }
                }
              }
            },
          ],
        };

        results = [
          {
            links: [
              {
                url: 'https://www.audible.de/',
                meta: {
                  domain: 'audible.de'
                },
                type: 'rh'
              },
            ],
          },
          {
            links: [
              {
                url: 'https://www.audible.de/mt/stoebern-und-entdecken',
                meta: {
                  domain: 'audible.de'
                }
              }
            ],
          },
        ];

        const expected = [
          {
            links: [
              {
                url: 'https://www.audible.de/',
                meta: {
                  domain: 'audible.de'
                },
                extra: {
                  offers_data: {
                    is_injected: true,
                    data: {
                      display_id: 'AudibleBoxTG3O2_D',
                      campaign_id: 'AudibleBox',
                      rs_dest: [
                        'dropdown'
                      ],
                      offer_id: 'AudibleBox_TG3_O2_V1'
                    },
                    promo_code: 'nicht benötigt',
                    thumbnail: 'http://cdn.cliqz.com/extension/rh-offers/Audible/74/image.png'
                  },
                },
                type: 'rh'
              }
            ]
          },
          {
            links: [
              {
                url: 'https://www.audible.de/mt/stoebern-und-entdecken',
                meta: {
                  domain: 'audible.de'
                }
              }
            ],
          },
        ];

        chai.expect(attachOffer(results, offer, config)).to.deep.equal(expected);
      });
    });
  });
