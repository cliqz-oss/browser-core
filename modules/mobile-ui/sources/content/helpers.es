/* global Handlebars */
import utils from '../../core/utils';

const AGO_CEILINGS =
  [
    [0, '', 1],
    [120, 'ago1Minute', 1],
    [3600, 'agoXMinutes', 60],
    [7200, 'ago1Hour', 1],
    [86400, 'agoXHours', 3600],
    [172800, 'agoYesterday', 1],
    [604800, 'agoXDays', 86400],
    [4838400, 'ago1Month', 1],
    [29030400, 'agoXMonths', 2419200],
    [58060800, 'ago1year', 1],
    [2903040000, 'agoXYears', 29030400],
  ];

export default {
  local(...args) {
    const name = args.shift();
    return utils.getLocalizedString.apply(null, [name, args]);
  },

  sendTelemetry(nResults) {
    utils.telemetry({
      type: 'Results Rendered',
      nResults,
    });
  },


  json(value) {
    return JSON.stringify(value);
  },

  // safe lookup partials
  getPartial(name) {
    if (Handlebars.templates[name]) {
      return Handlebars.templates[name];
    }
    // telemetry
    return () => '';
  },

  math(lvalue, operator, rvalue) {
    const lval = parseFloat(lvalue);
    const rval = parseFloat(rvalue);

    switch (operator) {
      case '+': return lval + rval;
      case '-': return lval - rval;
      case '*': return lval * rval;
      case '/': return lval / rval;
      case '%': return lval % rval;
      default: break;
    }
    return '';
  },

  logic(lvalue, operator, rvalue, options) {
      switch(operator) {
          case "|":           return lvalue | rvalue;
          case "||":          return lvalue || rvalue;
          case "&":           return lvalue & rvalue;
          case "&&":          return lvalue && rvalue;
          case "^":           return lvalue ^ rvalue;
          case "is":          return lvalue == rvalue;
          case "starts_with": return lvalue.indexOf(rvalue) == 0;
          case "===":         return lvalue === rvalue;
          case "!=":          return lvalue != rvalue;
          case "<":           return lvalue < rvalue;
          case ">":           return lvalue > rvalue;
      }
  },

  debug() {
    /* eslint-disable */
    console.log("%c Template Data " + this.vertical + " ","color:#fff;background:green",this);
    /* eslint-enable */
  },

  timeOrCalculator(ezType) {
    const type = ezType === 'time' ? 'time' : 'calculator';
    return Handlebars.helpers.local(type);
  },

  mobileWikipediaUrls(url) {
    return url.replace('http://de.wikipedia.org/wiki","https://de.m.wikipedia.org/wiki');
  },
  kind_printer(kind = []) {
    // we need to join with semicolon to avoid conflicting with the comma from json objects
    return kind.join(';');
  },
  /* eslint-disable */
  /* @TODO fix it!!! */
  emphasis(text, q, minQueryLength, cleanControlChars) {
    // lucian: questionable solution performance wise
    // strip out all the control chars
    // eg :text = "... \u001a"
    if(!q) return text;
    q = q.trim();
    if(text && cleanControlChars) text = text.replace(/[\u0000-\u001F]/g, ' ')

    if(!text || !q || q.length < (minQueryLength || 2)) return text;

    var map = Array(text.length),
        tokens = q.toLowerCase().split(/\s+|\.+/).filter(function(t) { return t && t.length>1; }),
        lowerText = text.toLowerCase(),
        out, high = false;

    tokens.forEach(function(token) {
      var poz = lowerText.indexOf(token);
      while(poz !== -1) {
        for(var i=poz; i<poz+token.length; i++)
          map[i] = true;
        poz = lowerText.indexOf(token, poz+1);
      }
    });
    out=[];
    var current = ''
    for(var i=0; i<text.length; i++) {
      if(map[i] && !high) {
        out.push(current);
        current='';
        current += text[i];
        high = true;
      }
      else if(!map[i] && high) {
        out.push(current);
        current='';
        current +=text[i];
        high = false;
      }
      else current += text[i];
    }
    out.push(current);

    return new Handlebars.SafeString(CLIQZ.templates.emphasis(out));
  },
  /* eslint-enable */

  limit(idx, maxIdx) {
    return idx < maxIdx;
  },

  agoline(ts) {
    if (!ts) {
      return '';
    }

    const now = (Date.now() / 1000);
    const seconds = parseInt(now - ts, 10);

    const ago = AGO_CEILINGS.find(([time]) => seconds < time);

    if (ago) {
      const roundedTime = parseInt(seconds / ago[2], 10);
      const translation = utils.getLocalizedString(ago[1], roundedTime);
      return translation;
    }

    return '';
  },
  even(value, options) {
    return value % 2 ? options.fn(this) : options.inverse(this);
  },

  distance(meters) {
    let distance;
    let unit;
    if (meters < 1000) {
      distance = meters.toFixed(0);
      unit = 'm';
    } else {
      distance = (meters / 1000).toFixed(1);
      unit = 'km';
    }
    return `${distance} ${unit}`;
  },

  sec_to_duration(seconds) {
    if (!seconds) {
      return null;
    }
    try {
      const s = parseInt(seconds, 10);
      const min = Math.floor(s / 60);
      const sec = `0${s % 60}`.slice(-2);
      return `${min}:${sec}`;
    } catch (e) {
      return null;
    }
  },

  numberFormat(number) {
    // just in case this helper is used on unsanitezed data from backend
    try {
      const num = parseFloat(number).toFixed(2);
      return parseFloat(num).toLocaleString(utils.PREFERRED_LANGUAGE);
    } catch (e) {
      return '';
    }
  },

  trimNumbers(number) {
    return Math.round(number);
  },
};
