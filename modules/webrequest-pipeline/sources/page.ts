
export const PAGE_LOADING_STATE = {
  CREATED: 'created',
  NAVIGATING: 'navigating',
  COMMITTED: 'committed',
  LOADED: 'loaded',
  COMPLETE: 'complete',
};

type Frame = {
  parentFrameId: number
  url?: string
}

interface FirefoxWebRequestDetails extends chrome.webRequest.WebRequestDetails {
  originUrl?: string
  documentUrl?: string
}

export default class Page {

  id: number
  url?: string
  isRedirect: boolean
  isPrivate: boolean
  isPrivateServer: boolean
  created: number
  destroyed: number | null
  lastRequestId: number | null
  frames: Map<number, Frame>
  state: string
  activeTime: number
  activeFrom: number
  requestStats: Map<string, any>
  annotations: any
  counter: number
  /**
   * TSV value (from DNT spec). This is a single character sent in the response header of the main
   * document request, indicating whether this request is tracked or not.
   */
  tsv: string
  /**
   * TSV Id value: For when a custom TSV value is specified.
   */
  tsvId?: string

  previous?: Page

  constructor({ id, active, url, incognito }: chrome.tabs.Tab) {
    this.id = id || 0;
    this.url = url;
    this.isRedirect = false;
    this.isPrivate = incognito;
    this.isPrivateServer = false;
    this.created = Date.now();
    this.destroyed = null;
    this.lastRequestId = null;
    this.frames = new Map([[0, {
      parentFrameId: -1,
      url,
    }]]);
    this.state = PAGE_LOADING_STATE.CREATED;

    this.activeTime = 0;
    this.activeFrom = active ? Date.now() : 0;

    this.requestStats = new Map();
    this.annotations = {};
    this.counter = 0;

    this.tsv = '';
    this.tsvId = undefined;
  }

  setActive(active: boolean) {
    if (active && this.activeFrom === 0) {
      this.activeFrom = Date.now();
    } else if (!active && this.activeFrom > 0) {
      this.activeTime += Date.now() - this.activeFrom;
      this.activeFrom = 0;
    }
  }

  updateState(newState: string) {
    this.state = newState;
  }

  stage() {
    this.setActive(false);
    this.destroyed = Date.now();
    // unset previous (to prevent history chain memory leak)
    this.previous = undefined;
  }

  getStatsForDomain(domain: string) {
    let stats = this.requestStats.get(domain);
    if (!stats) {
      stats = {};
      this.requestStats.set(domain, stats);
    }
    return stats;
  }

  setTrackingStatus(status: { value: string, statusId: string }) {
    this.tsv = status.value;
    this.tsvId = status.statusId;
  }

  getFrameAncestors({ parentFrameId }: chrome.webRequest.WebRequestDetails) {
    const ancestors = [];

    // Reconstruct frame ancestors
    let currentFrameId = parentFrameId;
    while (currentFrameId !== -1) {
      const frame = this.frames.get(currentFrameId);

      // If `frame` if undefined, this means we do not have any information
      // about the frame associated with `currentFrameId`. This can happen if
      // the event for `main_frame` or `sub_frame` was not emitted from the
      // webRequest API for this frame; this can happen when Service Workers
      // are used. In this case, we consider that the parent frame is the main
      // frame (which is very likely the case).
      if (frame === undefined) {
        ancestors.push({
          frameId: 0,
          url: this.url,
        });
        break;
      }

      // Continue going up the ancestors chain
      ancestors.push({
        frameId: currentFrameId,
        url: frame.url,
      });
      currentFrameId = frame.parentFrameId;
    }

    return ancestors;
  }

  /**
   * Return the URL of top-level document (i.e.: tab URL).
   */
  getTabUrl(): string | undefined {
    return this.url;
  }

  /**
   * Return the URL of the frame.
   */
  getFrameUrl(context: FirefoxWebRequestDetails): string | undefined {
    const { frameId } = context;

    const frame = this.frames.get(frameId);

    // In some cases, frame creation does not trigger a webRequest event (e.g.:
    // if the iframe is specified in the HTML of the page directly). In this
    // case we try to fall-back to something else: documentUrl, originUrl,
    // initiator.
    if (frame === undefined) {
      return context.documentUrl || context.originUrl || context.initiator;
    }

    return frame.url;
  }
}
