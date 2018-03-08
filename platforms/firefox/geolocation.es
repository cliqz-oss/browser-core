export default function () {
  const geoService = Components.classes["@mozilla.org/geolocation;1"]
    .getService(Components.interfaces.nsISupports);

  return new Promise((resolve, reject) => {
    geoService.getCurrentPosition(position => {
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    }, reject);
  });
}
