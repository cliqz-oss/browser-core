import { getDuplicateLinksByUrl } from '../operators/results/utils';
import { annotate, deduplicate } from '../operators/responses/deduplicate';
import combineAnyLatest from '../operators/streams/static/combine-any-latest';

// TODO: dedup before collecting (i.e., only for new results)
export default (target$, reference$) => {
  const duplicates$ = combineAnyLatest([target$, reference$])
    .map(([{ results: target } = { }, { results: reference } = { }]) =>
      getDuplicateLinksByUrl(target || [], reference || []));

  return {
    target$: duplicates$
      .withLatestFrom(target$)
      .map(([duplicates, response]) => deduplicate(response, duplicates)),
    reference$: duplicates$
      .withLatestFrom(reference$)
      .map(([duplicates, response]) => annotate(response, duplicates)),
  };
};
