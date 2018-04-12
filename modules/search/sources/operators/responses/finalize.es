import apply from '../apply';
import decrease from '../decrease';
import limit from '../limit';
import merge from '../merge';
import reconstruct from '../reconstruct';
import smooth from '../smooth';
import trim from '../trim';

export default observable => observable
  .let(smooth)
  // TODO: combine the following maps into a single function
  .map(responses => responses.map(limit))
  .map(merge)
  .map(decrease)
  .map(trim)
  .map(response => apply(response, reconstruct))
  .pluck('results');
