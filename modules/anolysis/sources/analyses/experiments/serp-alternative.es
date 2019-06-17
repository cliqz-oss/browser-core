export default [
  {
    name: 'analyses.experiments.serp.alternative',
    version: 2,
    needsGid: false,
    sendToBackend: true,
    generate: ({ records }) => {
      const stateSignals = records.get('metrics.experiments.serp.state');

      if (stateSignals.length === 0) {
        return [];
      }

      // use values from last state signal on a day
      const lastStateSignal = stateSignals[stateSignals.length - 1];
      const { group, serpAlternativeSearchEngine } = lastStateSignal;

      const searchClickSignalsOther = records.get('metrics.experiments.serp.click.search')
        .filter(({ engine }) => engine !== 'cliqz');

      return [{
        group: group || null,
        serpAlternativeSearchEngine: serpAlternativeSearchEngine || null,
        category: {
          web: searchClickSignalsOther.filter(({ category }) => category === 'web').length,
          pictures: searchClickSignalsOther.filter(({ category }) => category === 'pictures').length,
          videos: searchClickSignalsOther.filter(({ category }) => category === 'videos').length,
          maps: searchClickSignalsOther.filter(({ category }) => category === 'maps').length,
          news: searchClickSignalsOther.filter(({ category }) => category === 'news').length,
        },
      }];
    },
    schema: {
      required: ['group', 'serpAlternativeSearchEngine', 'category'],
      properties: {
        // AB test group this user is in
        group: { enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', null] },
        // selected alternative search engine (at the end of the day)
        serpAlternativeSearchEngine: { enum: ['google', 'duckduckgo', 'bing', 'yahoo', 'startpage', 'ecosia', 'qwant', null] },
        // click count per result category (could come from a mix of engines)
        category: {
          required: ['web', 'pictures', 'videos', 'maps', 'news'],
          properties: {
            web: { type: 'integer', minimum: 0 },
            pictures: { type: 'integer', minimum: 0 },
            videos: { type: 'integer', minimum: 0 },
            maps: { type: 'integer', minimum: 0 },
            news: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
  },
];
