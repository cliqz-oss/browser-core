import { getMainLink } from './normalize';

const RANKINGS = new Map([
  ['instant', 1],

  ['calculator', 2],
  ['currency', 2],
  ['weatherEZ', 2],
  ['flight', 2],
  ['movie-showtimes', 2],

  ['history', 3],
]);

const getRanking = (result) => {
  const main = getMainLink(result);
  return RANKINGS.get(main.template)
        || RANKINGS.get(main.type) // Then template is not needed
        || RANKINGS.get(main.provider)
        || 4;
};

const sort = results => results.sort((r1, r2) => getRanking(r1) - getRanking(r2));

export default ({ results, ...response }) => ({
  results: sort(results),
  ...response,
});
