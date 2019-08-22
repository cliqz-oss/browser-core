/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  time: {
    query: 'time berlin',
    results: [
      {
        url: 'https://www.timeanddate.com/worldclock/germany/berlin',
        href: 'https://www.timeanddate.com/worldclock/germany/berlin',
        friendlyUrl: 'timeanddate.com/worldclock/germany/berlin',
        kind: [
          'X|{"class":"EntityTime"}'
        ],
        provider: 'cliqz',
        template: 'time',
        text: 'time berlin',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'domain',
          domain: 'timeanddate.com',
          host: 'timeanddate.com',
          hostAndPort: 'timeanddate.com',
          port: '',
          url: 'timeanddate.com/worldclock/germany/berlin',
          score: 0,
          subType: {
            class: 'EntityTime',
            id: '519b6df05b78b84c4ad3f8272a2067fc76a1c8f20ad5e5f9c5264a8580c90418',
            name: 'TIME'
          },
          latency: 137,
          backendCountry: 'de',
          completion: '',
          logo: {
            text: 'ti',
            backgroundColor: '4bd3b2',
            brandTxtColor: '2d2d2d',
            buttonsClass: 'cliqz-brands-button-5',
            style: 'background-color: #4bd3b2;color:#fff;'
          },
          extraLogos: {},
          externalProvidersLogos: {
            kicker: {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1554882466943/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1554882466943/logos/kicker/$.svg); text-indent: -10em;'
            }
          }
        },
        data: {
          deepResults: [],
          extra: {
            time_data: {
              cities_by_tz: null,
              main: {
                expression: 'Thursday, May 9, 2019',
                location: 'Berlin',
                mapped_location: 'Berlin, Germany',
                time: '9:05 am',
                tz_info: 'Europe/Berlin (UTC/GMT 2.0)'
              }
            }
          },
          kind: [
            'X|{"class":"EntityTime"}'
          ],
          template: 'time'
        }
      },
    ]
  },
  timezone: {
    query: 'time australia',
    results: [
      {
        url: 'https://24timezones.com/current_local/australia_time.php',
        href: 'https://24timezones.com/current_local/australia_time.php',
        friendlyUrl: '24timezones.com/current_local/australia_time.php',
        kind: [
          'X|{"class":"EntityTime"}'
        ],
        provider: 'cliqz',
        template: 'time',
        text: 'time australia',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: '24timezones.com',
          host: '24timezones.com',
          hostAndPort: '24timezones.com',
          port: '',
          url: '24timezones.com/current_local/australia_time.php',
          score: 0,
          subType: {
            class: 'EntityTime',
            id: 'e7a2fe4cb15e9726e25f947b0d7545f43bb116ce0d35c3ccbe0f40a0a38239c3',
            name: 'TZ_TIME'
          },
          latency: 138,
          backendCountry: 'de',
          completion: '',
          logo: {
            text: '24',
            backgroundColor: 'c3043e',
            brandTxtColor: '2d2d2d',
            buttonsClass: 'cliqz-brands-button-1',
            style: 'background-color: #c3043e;color:#fff;'
          },
          extraLogos: {},
          externalProvidersLogos: {
            kicker: {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1554882466943/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1554882466943/logos/kicker/$.svg); text-indent: -10em;'
            }
          }
        },
        data: {
          deepResults: [],
          extra: {
            time_data: {
              cities_by_tz: [
                {
                  cities: [
                    'Rockingham',
                    'Mandurah',
                    'Bunbury'
                  ],
                  time_info: {
                    expression: '05/09/2019',
                    time: '4:15 pm',
                    tz_info: 'GMT+8.0'
                  }
                },
                {
                  cities: [
                    'Adelaide',
                    'Darwin',
                    'Maitland'
                  ],
                  time_info: {
                    expression: '05/09/2019',
                    time: '5:45 pm',
                    tz_info: 'GMT+9.5'
                  }
                },
                {
                  cities: [
                    'Sydney',
                    'Melbourne',
                    'Brisbane'
                  ],
                  time_info: {
                    expression: '05/09/2019',
                    time: '6:15 pm',
                    tz_info: 'GMT+10.0'
                  }
                }
              ],
              main: {
                expression: 'Thursday, May 9, 2019',
                location: 'Canberra',
                mapped_location: 'Canberra, Australia',
                time: '6:15 pm',
                tz_info: 'Australia/Sydney (UTC/GMT 10.0)'
              }
            }
          },
          kind: [
            'X|{"class":"EntityTime"}'
          ],
          template: 'time'
        }
      },
    ]
  },
};
