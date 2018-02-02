import Rx from '../../platform/lib/rxjs';
import { getMainLink } from '../operators/normalize';

const getMainLinks = ({ results }) =>
  results.map(getMainLink);

const removeEmptyResults = ({ results, ...response }) => ({
  ...response,
  results: results
    .filter(result => getMainLink(result).template !== 'empty'),
});

const removeCompletedLinks = links =>
  links.filter(link => link.meta.isIncomplete);

const isNotEmpty = links => links.length > 0;

const getKey = link =>
  (link.meta.triggerMethod === 'query' ? 'query' : link.url);

const merge = ([{ results: completed }, { results: original, ...rest }]) => {
  const indices = new Map();
  const updated = [...original];

  original
    .forEach((result, index) => {
      const link = getMainLink(result);
      const key = getKey(link);
      indices.set(key, index);
    });
  completed
    .forEach((result) => {
      const link = getMainLink(result);
      const key = getKey(link);
      if (indices.has(key)) {
        const index = indices.get(key);
        updated[index] = result;
      }
    });

  return {
    ...rest,
    results: updated,
  };
};

export default function update(query, richHeader, cliqz$, config) {
  return Rx.Observable.merge(
    cliqz$,
    cliqz$
      .map(getMainLinks)
      .map(removeCompletedLinks)
      .filter(isNotEmpty)
      .flatMap(links => richHeader.search(query, links, config))
      .withLatestFrom(cliqz$)
      .map(merge),
  )
    .map(removeEmptyResults)
    .share();
}
