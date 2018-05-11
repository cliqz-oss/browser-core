export function txtToDom(txt) {
  const parser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);
  return parser.parseFromString(txt, 'text/xml');
}
