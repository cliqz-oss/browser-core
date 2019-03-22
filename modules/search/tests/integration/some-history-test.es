import mixerTest, { modifyHistoryResults } from './helpers';
import { withHistoryView, withoutHistoryView } from './results/some-history';

export default function () {
  context('for results coming from cliqz and history for a simple query', function () {
    const results = modifyHistoryResults({ withHistoryView, withoutHistoryView });
    mixerTest({ isWithHistory: true, query: 'headphones', results });
  });
}
