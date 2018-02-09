import fetch, { Headers, Request, Response } from 'node-fetch';

export default fetch;

export function fetchFactory() {
  return fetch;
}

export {
  fetch,
  Headers,
  Request,
  Response,
};
