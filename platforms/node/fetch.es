import fetch, { Headers, Request, Response } from 'node-fetch';

export default fetch;

const isTrackableOriginHeaderFromOurExtension = () => false;

export {
  fetch,
  Headers,
  Request,
  Response,
  isTrackableOriginHeaderFromOurExtension
};
export const fetchArrayBuffer = fetch;
