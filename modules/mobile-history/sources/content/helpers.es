import utils from 'core/utils';

export default {
  local(key) {
    var args = Array.prototype.slice.call(arguments);
    var name = args.shift();
    return utils.getLocalizedString.apply(null, [name, args]);
  },
  debug(optionalValue) {
    console.log("%c Template Data " + this.vertical + " ","color:#fff;background:green",this);
  },
  conversationsTime(time) {
    var d = new Date(time);
    var hours = d.getHours();
    hours = hours > 9 ? hours : '0' + hours
    var minutes = d.getMinutes();
    minutes = minutes > 9 ? minutes : '0' + minutes
    var formatedDate = hours + ':' + minutes;
    return formatedDate;
  },
  breakLine(text) {
    return (text || '').split(/<br ?\/>/);
  }
}
