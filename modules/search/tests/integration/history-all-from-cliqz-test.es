import mixerTest, { modifyHistoryResults } from './helpers';
import { withHistoryView, withoutHistoryView } from './results/history-all-from-cliqz';

export default function () {
  context('for same results coming from cliqz and history for a simple query', function () {
    const results = modifyHistoryResults({ withHistoryView, withoutHistoryView });
    mixerTest({ isWithHistory: true, query: 'water', results });
  });
}
