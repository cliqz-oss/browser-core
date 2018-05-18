import apply from '../apply';
import decrease from '../decrease';
import sort from '../sort';
import limit from '../limit';
import merge from '../merge';
import reconstruct from '../reconstruct';
import smooth from '../smooth';
import trim from '../trim';
import enhance from '../enhance';

export default (observable$, config) => observable$
  .let(obs => smooth(obs, config))
  // TODO: combine the following maps into a single function
  .map(responses => responses.map(limit))
  .map(merge)
  .map(decrease)
  .map(trim)
  .map(sort)
  .map(enhance)
  .map(response => apply(response, reconstruct))
  .pluck('results');
