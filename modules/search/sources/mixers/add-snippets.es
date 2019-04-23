import { combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

const addSnippetsResults = (results, snippetsResult) => [snippetsResult, ...results];

export const addSnippetsResultsToResultResponses = (
  resultResponse,
  snippetsResponse,
) => {
  const { results } = resultResponse;
  const { snippets } = snippetsResponse;

  const resultsWithSnippets = Array.isArray(snippets) && snippets.length > 0
    ? addSnippetsResults(results, snippets[0])
    : results;

  return {
    ...resultResponse,
    results: resultsWithSnippets,
  };
};

export default function (results$, snippets$) {
  return combineLatest(results$, snippets$.pipe(startWith({ snippets: [] })))
    .pipe(
      map(([resultResponse, snippetsResponse]) =>
        addSnippetsResultsToResultResponses(resultResponse, snippetsResponse))
    );
}
