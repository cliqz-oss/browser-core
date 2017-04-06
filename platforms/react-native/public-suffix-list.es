import { TLDs } from '../core/tlds';

export function getGeneralDomain(dom) {
  var v1 = dom.split('.').reverse();
  var pos = 0;
  for(var i=0; i < v1.length; i++) {
    if (TLDs[v1[i]]) pos = i+1;
    else {
      if (i>0) break;
      else if(v1.length == 4) {
          // check for ip
          let is_ip = v1.map(function(s) {
              return parseInt(s);
          }).every(function(d) {
              return d >= 0 && d < 256;
          });
          if (is_ip) {
              return dom;
          }
          continue;
      }
    }
  }
  return v1.slice(0, pos+1).reverse().join('.');
}
