export default function maybe(object, methodName, ...args) {
  return new Promise((resolve, reject) => {
    const method = object[methodName];
    const returnedValue = method.call(object, args);

    if (returnedValue) {
      resolve(returnedValue);
    } else {
      reject(new Error(`${methodName} returned falsy value`));
    }
  });
}
