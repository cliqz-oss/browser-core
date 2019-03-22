import mixerTest from './helpers';
import results from './results/only-cliqz-complex-query';

export default function () {
  context('for results coming only from cliqz for a complex query', function () {
    mixerTest({ query: 'best songs in 2018', results });
  });
}
