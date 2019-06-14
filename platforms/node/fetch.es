import fetch, { Headers, Request, Response } from 'node-fetch';

export default fetch;

const isTrackableOriginHeaderFromOurExtension = () => false;

const $fetch = fetch;
const $Headers = Headers;
const $Request = Request;
const $Response = Response;

export {
  $fetch as fetch,
  $Headers as Headers,
  $Request as Request,
  $Response as Response,
  isTrackableOriginHeaderFromOurExtension
};
export const fetchArrayBuffer = fetch;
