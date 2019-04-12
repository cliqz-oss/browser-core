import random from '../../core/helpers/random';

/**
 * NOTE: this is in some aspects a code smell. This logic used to live in cliqz
 * utils and from the usage pattern has been made a service since it seemed to
 * correspond best at the time. On the other hand, we should probably not use
 * this as a global store for properties related somehow to search and a better
 * design should be implemented (e.g.: it seems weird that queryLastDraw should
 * be stored here as it's a property of the space where results are rendered).
 */
export default function service() {
  let queryLastDraw = null;
  let queryCount = null;
  let sessionSeq = 0;
  let searchSession = '';

  return {
    setQueryLastDraw(ts) {
      queryLastDraw = ts;
    },
    getQueryLastDraw() {
      return queryLastDraw;
    },
    incrementSessionSeq() {
      sessionSeq += 1;
    },
    incrementQueryCount() {
      queryCount += 1;
    },
    setSearchSession() {
      const rand = random(32);
      searchSession = rand;
      sessionSeq = 0;
      queryCount = 0;
      queryLastDraw = 0;
    },
    encodeSessionParams() {
      if (searchSession.length) {
        return `&s=${encodeURIComponent(searchSession)}&n=${sessionSeq}&qc=${queryCount}`;
      }
      return '';
    },
  };
}
