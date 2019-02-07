// TODO: move `finalize` to `streams`

import { pipe } from 'rxjs';

import mapResponses from '../streams/map-responses';

import rerank from '../responses/rerank';

// TODO: move all these to 'operators/responses' and use mapResponses
import addCompletionToResults from '../streams/add-completion-to-results';
import enhanceResults from '../streams/enhance-results';
import filterEmptyQueries from '../streams/filter-empty-queries';
import limitResults from '../streams/limit-results';
import mergeResults from '../streams/merge-results';
import reconstructResults from '../streams/reconstruct-results';
import smoothResults from '../streams/smooth-results';
import trimResults from '../streams/trim-results';

export default config => pipe(
  smoothResults(config),
  filterEmptyQueries(config),
  limitResults(config),
  mergeResults(config),
  // only one response is left after `merge`
  addCompletionToResults(config),
  mapResponses(rerank, config),
  trimResults(config),
  enhanceResults(config),
  reconstructResults(config),
);
