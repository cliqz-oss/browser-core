
export default {

  lang: 'en',

  state: () => ['de', 'en'],
  stateToQueryString: () => `&lang=${this.lang}`,
};
