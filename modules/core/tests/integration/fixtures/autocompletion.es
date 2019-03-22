// final arrays with test cases
const testAutocompleteArray = [];
const testNoAutocompleteArray = [];

// arrays with query/expected url or just query needed to build the final arrays
const queryAutocompleteArray = [
  { query: 'f', friendlyUrl: 'facebook.com' },
  { query: 'facebook', friendlyUrl: 'facebook.com' },
  { query: 'facebook.', friendlyUrl: 'facebook.com' },
  { query: 'facebook.co', friendlyUrl: 'facebook.com' },
  { query: 'www.f', friendlyUrl: 'www.facebook.com' },
  { query: 'www.facebook', friendlyUrl: 'www.facebook.com' },
  { query: 'www.facebook.', friendlyUrl: 'www.facebook.com' },
  { query: 'www.facebook.co', friendlyUrl: 'www.facebook.com' },
  { query: 'https://f', friendlyUrl: 'https://facebook.com' },
  { query: 'https://facebook', friendlyUrl: 'https://facebook.com' },
  { query: 'https://facebook.', friendlyUrl: 'https://facebook.com' },
  { query: 'https://facebook.co', friendlyUrl: 'https://facebook.com' },
  { query: 'https://www.f', friendlyUrl: 'https://www.facebook.com' },
  { query: 'https://www.facebook', friendlyUrl: 'https://www.facebook.com' },
  { query: 'https://www.facebook.', friendlyUrl: 'https://www.facebook.com' },
  { query: 'https://www.facebook.co', friendlyUrl: 'https://www.facebook.com' },
  { query: 'http://f', friendlyUrl: 'http://facebook.com' },
  { query: 'http://facebook', friendlyUrl: 'http://facebook.com' },
  { query: 'http://facebook.', friendlyUrl: 'http://facebook.com' },
  { query: 'http://facebook.co', friendlyUrl: 'http://facebook.com' },
  { query: 'http://www.f', friendlyUrl: 'http://www.facebook.com' },
  { query: 'http://www.facebook', friendlyUrl: 'http://www.facebook.com' },
  { query: 'http://www.facebook.', friendlyUrl: 'http://www.facebook.com' },
  { query: 'http://www.facebook.co', friendlyUrl: 'http://www.facebook.com' },
];
const queryNoAutocompleteArray = [
  'book',
  'facebook '
];

// array with urls with which backend responds
const urlArray = [
  'https://facebook.com',
  'https://www.facebook.com',
  'http://facebook.com',
  'http://www.facebook.com',
//  'https://facebook.com/',
];

// building testAutocomplete array
queryAutocompleteArray.forEach((obj) => {
  urlArray.forEach((url) => {
    testAutocompleteArray.push({
      query: obj.query,
      results: [{ url }],
      friendlyUrl: obj.friendlyUrl,
    });
  });
  testAutocompleteArray.push(
    {
      query: obj.query,
      results: [{ url: 'https://www.facebook.com/testing/path' }],
      friendlyUrl: `${obj.friendlyUrl}/testing/path`,
    },
    {
      query: obj.query,
      results: [{ url: 'http://facebook.com/testing?random=query' }],
      friendlyUrl: `${obj.friendlyUrl}/testing?random=query`,
    },
    {
      query: obj.query,
      results: [{ url: 'http://facebook.com/Case/Sensitive?charset=UTF-8' }],
      friendlyUrl: `${obj.friendlyUrl}/Case/Sensitive?charset=UTF-8`,
    },
  );
});

/*
to add corner test cases to testAutocompleteArray uncomment this part
and add your data:

const additionalTestAutocompleteArray = [
  {
    query: query,
    results: [
      {
        url: url,
      }
    ],
    friendlyUrl: friendlyUrl,
  },
];

testAutocompleteArray.concat(additionalTestAutocompleteArray);

*/

// building testNoAutocomplete array
queryNoAutocompleteArray.forEach((query) => {
  urlArray.forEach((url) => {
    testNoAutocompleteArray.push({
      query,
      results: [{ url }],
    });
  });
});

export { testAutocompleteArray, testNoAutocompleteArray };
