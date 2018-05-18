import addLogos from './results/add-logos';
import addDistance from './results/add-distance';

const compose = fns => target => fns.reduce((ret, fn) => fn(ret), target);

export default ({ results, ...response }) => ({
  ...response,
  results: compose([
    addLogos,
    addDistance,
  ])(results),
});
