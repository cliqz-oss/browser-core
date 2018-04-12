import { getDuplicateLinksByUrl } from '../operators/results/utils';
import { annotate, deduplicate } from '../operators/responses/deduplicate';

// TODO: dedup before collecting (i.e., only for new results)
export default (target$, reference$) => {
  const duplicates$ = target$
    .combineLatest(reference$)
    .map(([target, reference]) =>
      getDuplicateLinksByUrl(target.results, reference.results));

  return {
    target$: duplicates$
      .withLatestFrom(target$)
      .map(([duplicates, response]) => deduplicate(response, duplicates)),
    reference$: duplicates$
      .withLatestFrom(reference$)
      .map(([duplicates, response]) => annotate(response, duplicates)),
  };
};
