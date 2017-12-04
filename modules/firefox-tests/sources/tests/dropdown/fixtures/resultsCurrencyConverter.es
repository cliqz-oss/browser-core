export default [
  {
    url: 'http://www.xe.com/de/currencyconverter/convert/?Amount=1,0\u0026From=EUR\u0026To=USD',
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
          main: 1.1465,
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
