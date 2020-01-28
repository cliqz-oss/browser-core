/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [
  {
    url: 'http://www.xe.com/de/currencyconverter/convert',
    score: 0,
    snippet: {
      extra: {
        formSymbol: '€',
        fromAmount: '1.00',
        fromCurrency: 'EUR',
        logo: 'logo-xe-com',
        mConversionRate: '1.1465',
        multiplyer: 1,
        toAmount: {
          extra: '65',
          main: 1.15,
        },
        toCurrency: 'USD',
        toSymbol: '$',
        toCurrencyName: 'United States dollars'
      },
      friendlyUrl: 'xe.com/de/currencyconverter/convert'
    },
    type: 'rh',
    subType: {
      class: 'EntityCurrency',
      id: '-5055564916657488688',
      name: 'currency_conversion'
    },
    template: 'currency',
    trigger_method: 'query'
  },
];

export const currencyAndSimpleResults = [
  {
    url: 'http://www.currencyconverterapi.com/',
    snippet: {
      extra: {
        formSymbol: '€',
        fromAmount: '1.00',
        fromCurrency: 'EUR',
        logo: 'logo-xe-com',
        mConversionRate: '1.1746',
        multiplyer: 1,
        toAmount: {
          extra: '46',
          main: 1.17,
        },
        toCurrency: 'USD',
        toSymbol: '$',
        toCurrencyName: 'United States dollars'
      },
      friendlyUrl: 'currencyconverterapi.com'
    },
    type: 'rh',
    subType: {
      class: 'EntityCurrency',
      id: '-5055564916657488688',
      name: 'currency_conversion'
    },
    template: 'currency',
    trigger_method: 'query'
  },
  {
    url: 'http://www.finanzen.net/waehrungsrechner/euro_us-dollar',
    snippet: {
      description: 'Aktien, Aktienkurse, Devisenkurse und Währungsrechner, Rohstoffkurse. Informationen rund um die Börse zu Aktie, Fonds und ETFs. Börsenkurse für Optionsscheine und Zertifikate. Aktienanalysen - finanzen.net',
      title: '> Title - Euro in Dollar Währungsrechner',
    },
  },
];
