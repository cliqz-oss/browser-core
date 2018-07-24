
/**
 * Extacts values from the DNT Tk header, given a list of response headers for a request
 * https://www.w3.org/TR/tracking-dnt/#dfn-tk
 * @param responseHeaders
 */
export default function getTrackingStatus(state) {
  const status = state.getResponseHeader('tk');
  if (status) {
    const [value, statusId] = status.split(';');
    return { value, statusId };
  }
  return null;
}
