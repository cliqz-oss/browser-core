export default fetch;

const isTrackableOriginHeaderFromOurExtension = () => false;

export {
  fetch,
  Headers,
  Request,
  Response,
  isTrackableOriginHeaderFromOurExtension
};
