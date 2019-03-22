import mixerTest, { modifyHistoryResults } from './helpers';
import { withHistoryView, withoutHistoryView } from './results/with-history-not-from-mixer';

export default function () {
  context('for results coming only from history with a result not from cliqz', function () {
    const results = modifyHistoryResults({ withHistoryView, withoutHistoryView });
    mixerTest({ isWithHistory: true, query: 'paper', results });
  });
}
