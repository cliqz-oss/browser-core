/*
Function to clean string for calculating route hash
*/
const punctuation = '!"\'()*,-./:;?[\\]^_`{|}~%$=&+#';
const regex = new RegExp(`[${punctuation}]`, 'g');
function cleanStr(_s) {
  // Replace all spaces

  // Because in some telemetry message we only create uniqu based on anti-duplicate.
  // Anti-duplicate is not a string, hence converting it to string.
  let s = `${_s}`;

  // Decode uri component
  // Need to find lua equivalent

  try {
    s = decodeURIComponent(s);
  } catch (e) {
    // pass
  }


  s = s.replace(/\s+/g, '');

  // Convert to lower
  s = s.toLowerCase();

  // Trim
  s = s.trim();

  // Clean the URL
  s = s.replace(/^http:\/\//, '');
  s = s.replace(/^https:\/\//, '');
  s = s.replace(/^www\./, '');


  // Remove all punctuation marks
  s = s.replace(regex, '');

  return s;
}

function getField(obj, path) {
  return path.split(/[.[\]]+/).filter(x => x).reduce((o, i) => o[i], obj);
}

function orderedStringify(t, res, onlyKeys) {
  if (!t || typeof t !== 'object') {
    if (t === undefined) {
      throw new Error('Found undefined field when trying to calculate msg routehash');
    }
    res.push(cleanStr(t));
  } else {
    const keys = Object.keys(t);
    keys.sort();
    const isArray = Array.isArray(t);
    keys.forEach((k) => {
      if (!isArray) {
        res.push(cleanStr(k));
      }
      if (!onlyKeys) {
        orderedStringify(t[k], res);
      }
    });
  }
}

/* This method will return the string based on mapping of which keys to use to hash for routing.
*/
export function getRouteHash(obj, sourceMap) {
  const action = obj.action;
  const keys = sourceMap[action].keys;
  const staticKeys = sourceMap[action].static || [];
  const res = [];
  keys.forEach(k => orderedStringify(getField(obj, k), res, staticKeys.some(sk => k.endsWith(sk))));
  return res.join('');
}

/**
 * Method to create payload to send for blind signature.
 * The payload needs to consist of <uPK,
                                    {mP}*r1, // BM1
                                    {mP, uPK}*r2, // BM2
                                    {DmC, uPK} * r3, // BM3
                                    SIG(uPK;bm1;bm2;bm3)
                                    >
 * @returns string with payload created.
*/

export function createPayloadBlindSignature(uPK, bm1, bm2, bm3, sig) {
  const payload = {};
  payload.uPK = uPK;
  payload.bm1 = bm1;
  payload.bm2 = bm2;
  payload.bm3 = bm3;
  payload.sig = sig;
  return payload;
}

/**
 * Method to create payload to send to proxy.
 * The payload needs to consist of <uPK,
                                    dmC,
                                    {H{mP}*r1}Dsk, // BlindSigned1
                                    {H(mP, uPK)}Dsk, // BlindSigned2
                                    {H(mP, dmC)}Dsk, // BlindSigned3
                                    SIG(uPK;dmC;bs1;bs2;bs3)
                                    >
 * @returns string with payload created.
 */

export function createPayloadProxy(uPK, suPK, mP, dmC, bs1, bs2, bs3, sig) {
  const payload = {};
  payload.uPK = uPK;
  payload.suPK = suPK;
  payload.mP = mP;
  payload.dmC = dmC;
  payload.bs1 = bs1;
  payload.bs2 = bs2;
  payload.bs3 = bs3;
  payload.sig = sig;
  return payload;
}
