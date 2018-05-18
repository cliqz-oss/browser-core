export default [
  {
    url: 'https://countrycode.org/germany',
    trigger_method: 'url',
    snippet: {
      friendlyUrl: 'countrycode.org/germany',
      extra: {
        country_name: 'Germany',
        dialing_prefix: 49,
        flag_uri: 'https://cdn.cliqz.com/extension/countries/flags/svg/de.svg',
        country_code: 'DE'
      }
    },
    subType: {
      id: '-3481798505982424047',
      name: 'countrycode',
      class: 'EntityDialingCode'
    },
    trigger: [],
    template: 'dialing-code',
    type: 'rh'
  },
];
