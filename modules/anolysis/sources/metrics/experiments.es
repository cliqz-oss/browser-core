const searchEngines = [
  'google', 'duckduckgo', 'bing', 'yahoo', 'startpage', 'ecosia', 'qwant'
];

export default [
  // send whenever a user clicks on a result or a query suggestion
  {
    name: 'metrics.experiments.serp.click.result',
    schema: {
      required: ['source', 'index', 'queryLength', 'isSearchEngine'],
      properties: {
        // 'm' for backend result, 'Z' for query suggestion
        source: { type: 'string', enum: ['m', 'Z'] },
        // index within results or query suggestions
        index: { type: 'integer', minimum: 0 },
        // number of characters
        queryLength: { type: 'integer', minimum: 0 },
        // true, if result is a search engine (e.g., google.de)*
        isSearchEngine: { type: 'boolean' },
      },
    },
  },
  /* send whenever a user clicked on the magnifying glass
   * to search (on Cliqz) or on an alternative search link
   */
  {
    name: 'metrics.experiments.serp.click.search',
    schema: {
      required: ['engine', 'category', 'view'],
      properties: {
        // selected search engine
        engine: {
          type: 'string',
          enum: ['cliqz'].concat(searchEngines),
        },
        // clicked result category (null if Cliqz search)
        category: { enum: [null, 'web', 'pictures', 'videos', 'maps', 'news'] },
        /* 'landing' for the landing page with the centered
         * URL bar and 'results' for the actual SERP
         */
        view: { type: 'string', enum: ['landing', 'results'] },
      }
    },
  },
  // send whenever the SERP page is shown
  {
    name: 'metrics.experiments.serp.show',
    schema: {
      required: ['queryLength', 'resultCount', 'suggestionCount', 'view'],
      properties: {
        // number of characters
        queryLength: { type: 'integer', minimum: 0 },
        // number of results
        resultCount: { type: 'integer', minimum: 0 },
        // number of query suggestions
        suggestionCount: { type: 'integer', minimum: 0 },
        /* 'landing' for the landing page with the centered
         * URL bar and 'results' for the actual SERP
         */
        view: { type: 'string', enum: ['landing', 'results'] },
      },
    },
  },
  // send whenever a user hit enter to search (on Cliqz)
  {
    name: 'metrics.experiments.serp.state',
    schema: {
      required: ['group', 'isCliqzDefaultEngine'],
      properties: {
        // AB test group this user is in
        group: { enum: [null, 'A', 'B', 'C', 'D', 'E', 'F'] },
        // true, if Cliqz is (still) the default search engine (users can change this)
        isCliqzDefaultEngine: { type: 'boolean' },
        // selected alternative search engine on SERP
        serpAlternativeSearchEngine: {
          type: 'string',
          enum: searchEngines,
        },
      },
    },
  },
  // send whenever a user hit enter to search (on Cliqz)
  {
    name: 'metrics.experiments.serp.enter.search',
    schema: {
      required: ['view'],
      properties: {
        /* 'landing' for the landing page with the centered
         * URL bar and 'results' for the actual SERP
         */
        view: { type: 'string', enum: ['landing', 'results'] },
      },
    }
  },
];
