import {
  app,
  expect,
  waitFor,
  win,
  CliqzEvents,
} from '../../core/test-helpers';
import { isMobile } from '../../../core/platform';
import { mockSearch, withHistory } from '../../core/integration/search-helpers';

export const modifyHistoryResults = ({ withHistoryView, withoutHistoryView }) => {
  const isBrowserConfig = app.config.modules.indexOf('history') > -1;
  return isBrowserConfig ? withHistoryView : withoutHistoryView;
};

export default ({ isWithHistory = false, query, results }) => {
  let searchResultsSub;
  let searchResults;

  if (isMobile) { return; }

  before(async function () {
    win.preventRestarts = true;
    await mockSearch({ results: results.cliqz });
    if (isWithHistory) {
      withHistory(results.history);
    } else {
      withHistory([]);
    }
    await app.modules.search.action('startSearch', query);

    searchResultsSub = CliqzEvents.subscribe('search:results', (r) => {
      searchResults = r;
    });

    await waitFor(() => {
      searchResults.results.forEach((r) => { expect(r.text, 'Filter outdated results').to.equal(query); });
      return expect(searchResults.results.length, 'Correct length of results').to.equal(results.final.length);
    });
  });

  after(function () {
    searchResultsSub.unsubscribe();
    win.preventRestarts = false;
  });

  it('returns final results in expected order', function () {
    // We need to keep waiting in case different providers enrich each other
    // (e.g. cliqz + history) which modifies the final result
    // Without waiting we compare the final result which might not be ready

    searchResults.results.forEach(async (result, i) => {
      await waitFor(() => expect(result.provider, 'Equal providers').to.equal(results.final[i].provider));

      if (result.provider !== 'instant') {
        await waitFor(() => expect(result.url, 'Equal URLs').to.equal(results.final[i].url));
      }

      if (results.final[i].title) {
        await waitFor(() => expect(result.title, 'Equal titles').to.equal(results.final[i].title));
      }
    });
  });
};
