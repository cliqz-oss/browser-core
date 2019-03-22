import mixerTest from './helpers';
import results from './results/only-cliqz';

export default function () {
  context('for results coming only from cliqz for a simple query', function () {
    mixerTest({ query: 'headphones', results });
  });
}
