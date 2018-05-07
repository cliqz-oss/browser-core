export default function (hostname) {
  return new Promise((resolve, reject) => {
    try {
      resolve(hostname);
    } catch (ee) {
      reject(ee);
    }
  });
}
