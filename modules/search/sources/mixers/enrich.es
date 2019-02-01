import { map } from 'rxjs/operators';
import deduplicate from '../operators/results/deduplicate';

const enrich = (enricher, target$, source$) =>
  enricher
    .connect(target$, source$).pipe(
      // enriching may introduce duplicate results,
      // also, history itself may contain duplicates
      map(({ results, ...response }) => ({
        ...response,
        results: deduplicate(results),
      }))
    );


export default enrich;
