let parseValue;

class Position {
  constructor() {
    this.i = 0;
  }

  inc() {
    this.i += 1;
  }

  getPos() {
    return this.i;
  }

  decr() {
    this.i -= 1;
  }
}

const reserved = new Set(['{', '}', '[', ']', ':', ',']);


function skipWhitespace(data, counter) {
  while (data.charAt(counter.getPos()) === ' ') {
    counter.inc();
  }
}

function parseObject(data, counter = new Position()) {
  let state = 'start';
  const obj = {};
  let key = '';

  for (let i = counter; i.getPos() < data.length; i.inc()) {
    const ch = data.charAt(i.getPos());
    if (ch === '{') {
      switch (state) {
        case 'start':
          state = 'key';
          break;
        default:
          throw new Error(`unexpected ${ch} when in ${state} at position ${i.i}`);
      }
    } else if (ch === '}') {
      if (key) {
        obj[key] = true;
        key = '';
      }
      return obj;
    } else if (ch === ':') {
      switch (state) {
        case 'key':
          i.inc();
          key = key.trim();
          obj[key] = parseValue(data, i);
          state = 'key';
          key = '';
          break;
        default:
          throw new Error(`unexpected ${ch} when in ${state} at position ${i.i}`);
      }
    } else if (ch === ',') {
      switch (state) {
        case 'key':
          key = '';
          state = 'key';
          break;
        default:
          throw new Error(`unexpected ${ch} when in ${state} at position ${i.i}`);
      }
    } else {
      switch (state) {
        case 'key':
          key += ch;
          break;
        default:
          throw new Error(`unexpected ${ch} when in ${state} at position ${i.i}`);
      }
    }
  }

  return obj;
}

function parseArray(data, counter) {
  skipWhitespace(data, counter);
  const value = [];
  for (let i = counter; i.getPos() < data.length; i.inc()) {
    const ch = data.charAt(i.getPos());

    if (ch === '[' || ch === ',') {
      i.inc();
    } else if (ch === ']') {
      break;
    }
    value.push(parseValue(data, counter));
  }
  return value;
}

parseValue = function parseVal(data, counter) {
  skipWhitespace(data, counter);
  const firstChar = data.charAt(counter.getPos());
  if (firstChar === '{') {
    return parseObject(data, counter);
  } else if (firstChar === '[') {
    return parseArray(data, counter);
  }

  let val = '';
  for (let i = counter; i.getPos() < data.length; i.inc()) {
    const ch = data.charAt(i.getPos());

    if (reserved.has(ch)) {
      break;
    }
    val += ch;
  }
  counter.decr();
  return val.trim();
};

export default parseObject;
