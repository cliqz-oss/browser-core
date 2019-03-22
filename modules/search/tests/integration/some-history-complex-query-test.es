import mixerTest, { modifyHistoryResults } from './helpers';
import { withHistoryView, withoutHistoryView } from './results/some-history-complex-query';

export default function () {
  context('for results coming from cliqz and history for a complex query', function () {
    const results = modifyHistoryResults({ withHistoryView, withoutHistoryView });
    mixerTest({ isWithHistory: true, query: 'highest peaks in europe', results });
  });
}
