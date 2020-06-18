function cloneObject(o) {
  return JSON.parse(JSON.stringify(o));
}

module.exports = {
  cloneObject,
};
