import Handlebars from 'handlebars';
import templates from './templates';
import utils from '../core/utils';

 const AGO_CEILINGS = [
        [0            , '',1],
        [120          , 'ago1Minute' , 1],
        [3600         , 'agoXMinutes'   , 60],
        [7200         , 'ago1Hour' , 1],
        [86400        , 'agoXHours'   , 3600],
        [172800       , 'agoYesterday'          , 1],
        [604800       , 'agoXDays'     , 86400],
        [4838400      , 'ago1Month'  , 1],
        [29030400     , 'agoXMonths'   , 2419200],
        [58060800     , 'ago1year'   , 1],
        [2903040000   , 'agoXYears'     , 29030400]
    ];

// Make sure the input string is in lower case
function latinMap(str) {
  const map = [
    { "base":"a", "letters":/[\u00E4]|ae/g },
    { "base":"o", "letters":/[\u00F6]|oe/g },
    { "base":"u", "letters":/[\u00FC]|ue/g },
    { "base":"s", "letters":/[\u00DF]|ss/g },
  ];

  map.forEach(mapper => {
    str = str.replace(mapper.letters, mapper.base);
  });

  return str;
}

function countRemovedChars(indexes, lBound, hBound) {
  let count = 0;
  indexes.forEach(index => {
    if (index >= lBound && index <= hBound) ++count;
  });
  return count;
}

export default {
  take(array, number) {
    return array.slice(0, number);
  },

  even(value, options) {
    if (value%2) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
  },

  emphasis(text, q, minQueryLength, cleanControlChars) {
    if(!q) return text;
    q = q.trim();

    if(text && cleanControlChars) {
      text.replace(/[\u0000-\u001F]/g, ' ');
    }

    var map = Array(text.length),
        tokens = latinMap(q.toLowerCase()).split(/\s+|\.+/).filter(function(t){ return t && t.length>1; }),
        lowerText = latinMap(text.toLowerCase()),
        out, high = false;

    // Store a list of index(es) where a character has been removed
    var indexes = [],
        patt = /ae|oe|ue|ss/g,
        match = null;

    while (match = patt.exec(text.toLowerCase())) {
      indexes.push(match.index);
    }

    var lastRemovedChars = 0,
        currentRemovedChars = 0;

    tokens.forEach(function(token){
      var poz = lowerText.indexOf(token);
      while(poz !== -1){
        //Number of characters have been removed before this token
        lastRemovedChars = countRemovedChars(indexes, 0, poz-1);
        //Number of characters have been remove in this token
        currentRemovedChars = countRemovedChars(indexes, poz, poz + token.length);
        for(var i=poz+lastRemovedChars; i<poz+token.length+currentRemovedChars+lastRemovedChars; i++)
            map[i] = true;
        poz = lowerText.indexOf(token, poz+1);
      }
    });

    out=[];
    var current = ''
    for(var i=0; i<text.length; i++){
      if(map[i] && !high){
        out.push(current);
        current='';
        current += text[i];
        high = true;
      }
      else if(!map[i] && high){
        out.push(current);
        current='';
        current +=text[i];
        high = false;
      }
      else current += text[i];
    }
    out.push(current);

    return new Handlebars.SafeString(templates.emphasis(out));
  },

  local(key) {
    var args = Array.prototype.slice.call(arguments);
    var name = args.shift();
    return utils.getLocalizedString.apply(null, [name, args]);
  },

  agoline(ts, options) {
    if(!ts) return '';
    var now = (new Date().getTime() / 1000),
        seconds = parseInt(now - ts),
        i=0, slot;

    while (slot = AGO_CEILINGS[i++])
        if (seconds < slot[0])
            return utils.getLocalizedString(slot[1], parseInt(seconds / slot[2]))
    return '';
  }


}
