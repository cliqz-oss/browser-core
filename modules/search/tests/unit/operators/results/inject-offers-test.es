/* global describeModule, chai */
const mock = {
  'search/operators/normalize': {
    getMainLink: ({ links }) => links[0],
  }
};

export default describeModule('search/operators/results/inject-offers',
  () => mock,
  () => {
    describe('#injectNonOrganicOffers', function () {
      let injectNonOrganicOffers;
      const results = [
        {
          links: [{ url: 'cliqz.com' }],
        },
        {
          links: [{ url: 'ghostery.com' }],
        },
      ];

      beforeEach(function () {
        injectNonOrganicOffers = this.module().injectNonOrganicOffers;
      });

      it('does not change results if there is no offer', function () {
        const offers = [];
        chai.expect(injectNonOrganicOffers(results, offers)).to.deep.equal(results);
      });

      it('does not change results if offers are disabled', function () {
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
              isEnabled: false,
            },
          },
        };

        chai.expect(injectNonOrganicOffers(results, [offer], config)).to.deep.equal(results);
      });

      it('does not change results if offer is organic', function () {
        const offer = {
          links: [
            {
              extra: {
                has_injection: true,
              }
            },
          ],
        };

        const config = {
          operators: {
            offers: {
              isEnabled: true,
            },
          }
        };
        chai.expect(injectNonOrganicOffers(results, [offer], config)).to.deep.equal(results);
      });

      it('injects offer as first result', function () {
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
              nonOrganicPosition: 'first',
              isEnabled: true,
            },
          }
        };
        const expected = [offer, ...results];
        chai.expect(
          injectNonOrganicOffers(results, [offer], config)).to.deep.equal(expected);
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
              nonOrganicPosition: 'last',
              isEnabled: true,
            },
          }
        };
        const expected = [...results, offer];
        chai.expect(
          injectNonOrganicOffers(results, [offer], config)).to.deep.equal(expected);
      });
    });

    describe('#organicOffers', function () {
      let injectOrganicOffer;
      const results = [
        {
          links: [{ url: 'audible.com' }],
        },
        {
          links: [{ url: 'ghostery.com' }],
        },
      ];
      beforeEach(function () {
        injectOrganicOffer = this.module().injectSmartCliqzOffer;
      });

      it('does not inject offer if there are no injected ids', function () {
        const offer = {
          links: [
            {
              extra: {
                has_injection: true
              }
            },
          ],
        };

        const config = {
          operators: {
            offers: {
              isEnabled: true,
              locationEnabled: true,
            }
          }
        };

        chai.expect(injectOrganicOffer(results, offer, config)).to.deep.equal(
          {
            results,
            isInjected: false
          });
      });

      it('injects offer to result that is a smartCliqz and matches the injected id', function () {
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

        const results = [
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

        chai.expect(injectOrganicOffer(results, offer, config)).to.deep.equal({
          results: expected,
          isInjected: true
        });
      });

      it('does not inject offer to result that is not smartCliqz', function () {
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

        const results = [
          {
            links: [
              {
                url: 'https://www.audible.de/',
                meta: {
                  domain: 'audible.de'
                },
                type: 'bm'
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

        chai.expect(injectOrganicOffer(results, offer, config)).to.deep.equal({
          results,
          isInjected: false
        });
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

        const results = [
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

        chai.expect(injectOrganicOffer(results, offer, config)).to.deep.equal({
          results: expected,
          isInjected: true
        });
      });
    });
  },
);
