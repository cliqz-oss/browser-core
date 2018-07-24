import apply from '../apply';
import rerank from '../rerank';
import limit from '../limit';
import merge from '../merge';
import reconstruct from '../reconstruct';
import smooth from '../smooth';
import trim from '../trim';
import enhance from '../enhance';
import addCompletion from './add-completion';

export default (observable$, config) => observable$
  .let(obs => smooth(obs, config))
  // TODO: combine the following maps into a single function
  .map(responses => responses.map(limit))
  .map(merge)
  .map(response => addCompletion(response, config))
  .map(rerank)
  .map(trim)
  .map(enhance)
  .map(response => apply(response, reconstruct))
  .pluck('results');
