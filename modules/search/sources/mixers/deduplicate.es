import except from '../operators/except';

const deduplicate = (target$, reference$) =>
  target$
    .combineLatest(reference$)
    // TODO: dedup before collecting (i.e., only for new results)
    .map(except);

export default deduplicate;
