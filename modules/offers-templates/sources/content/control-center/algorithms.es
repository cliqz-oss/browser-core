function identity(x) { return x; }

export function uniqueIndexes(array = [], op = identity) {
  const map = {};
  array.forEach((elem, i) => {
    const key = op(elem);
    if (map[key] === undefined) { map[key] = i; }
  });
  const indexes = Object.values(map);
  indexes.sort((a, b) => a - b);
  return indexes;
}

export function groupBy(array = [], op = identity) {
  const map = {};
  array.forEach((elem) => {
    const key = op(elem);
    map[key] = map[key] || [];
    map[key].push(elem);
  });
  return map;
}

/**
* text {string}
* word {string}
* @return {[boolean, string]}
*/
export function removeWord(text = '', word) {
  if (!word) { return [false, text]; }
  const regexp = new RegExp(`\\b${word}\\b ?`, 'g');
  const newText = text.replace(regexp, '');
  return [newText.length < text.length, newText];
}
