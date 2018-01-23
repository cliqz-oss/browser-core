export default {
  'currency converter': {
    query: '200 usd to euro',
    results: [
      {
        'data': {
          'extra': {
            'formSymbol': '€',
            'fromAmount': '200.00',
            'fromCurrency': 'EUR',
            'logo': 'logo-xe-com',
            'mConversionRate': '1.0581',
            'multiplyer': 1,
            'toAmount': {
              'extra': '00',
              'main': 211.62
            },
            'toCurrency': 'USD',
            'toSymbol': '$'
          },
          'friendlyUrl': 'xe.com/de/currencyconverter/convert',
          'subType': {
            'class': 'EntityCurrency',
            'trigger_method': 'rh_query',
            'ez': 'deprecated',
            'i': 0,
            'cs': 0
          },
          'template': 'currency',
          'kind': [
            'X|{\'class\':\'EntityCurrency\',\'trigger_method\':\'rh_query\',\'ez\':\'deprecated\',\'i\':0,\'cs\':0}'
          ]
        },
        'title': 'Xe',
        'url': 'http://www.xe.com/de/currencyconverter/convert/?Amount=200,0&From=EUR&To=USD',
        'description': '',
        'originalUrl': 'http://www.xe.com/de/currencyconverter/convert/?Amount=200,0&From=EUR&To=USD',
        'type': 'cliqz-extra',
        'text': '200 euro to dollar',
        'maxNumberOfSlots': 3
      }
    ]
  },
  'calculator': {
    query: '1 + 1',
    results: [
      {
        'data': {
          'title': '2',
          'extra': {
            'expression': '1 + 1',
            'answer': '2',
            'is_calculus': true,
            'support_copy_ans': true
          },
          'subType': {
            'type': 'calculator'
          },
          'template': 'calculator',
          'kind': [
            'X|{\'type\':\'calculator\'}'
          ]
        },
        'title': '2',
        'url': '',
        'description': '',
        'originalUrl': '',
        'type': 'cliqz-extra',
        'text': '1+1',
        'maxNumberOfSlots': 3
      }
    ]
  }
}
