import { toBase64 } from '../../core/encoding';
import { fetch } from '../../core/http';
import logger from '../common/offers_v2_logger';
import Offer from './offer';

async function downloadOneImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`offers/image-downloader: Can't fetch '${url}': ${resp.status}/${resp.statusText}`);
  }

  // `Response` of mocked fetch doesn't have `arrayBuffer` function,
  // but has a similar functionality under other name.
  const content = await (resp.arrayBuffer ? resp.arrayBuffer() : resp.buffer());

  const b64Image = toBase64(new Uint8Array(content));
  const imageType = resp.headers.get('content-type');
  return `data:${imageType};base64,${b64Image}`;
}

/**
 * The problem:
 *
 * - Offers are injected into the html pages.
 * - Browser downloads offer images in the context of the page.
 * - Third-party privacy extensions might categorize the images
 *   as trackers and blacklist Cliqz.
 *
 * The solution:
 *
 * Download the images on demand in the background context.
 * Store them as dataurls inside offers self in `OffersDB`.
 *
 * @class ImageDownloader
 */
export default class ImageDownloader {
  constructor(offersDB) {
    this.offersDB = offersDB;
  }

  /**
   * Find an already downloaded image.
   * If not found: download and store in `OffersDB`
   *
   * @param {string} url
   * @returns {Promise<null|string>}
   */
  async processUrl(url) {
    if (!url) {
      return null;
    }

    //
    // Find an already downloaded image for `url`
    // Find offers that
    // - use the image from `url`, and
    // - don't have the image inside.
    //
    let dataurl = null;
    const offersThatNeedLogo = new Set();
    const offersThatNeedPicture = new Set();
    const findImage = (offer, getterUrl, getterDataurl, offersThatNeedColl) => {
      if (getterUrl.call(offer) === url) {
        const found = getterDataurl.call(offer);
        if (found) {
          dataurl = found;
        } else {
          offersThatNeedColl.add(offer);
        }
      }
    };
    this.offersDB.getOffers().forEach((preOffer) => {
      const offer = new Offer(preOffer.offer);
      findImage(offer, offer.getPictureUrl, offer.getPictureDataurl, offersThatNeedPicture);
      findImage(offer, offer.getLogoUrl, offer.getLogoDataurl, offersThatNeedLogo);
    });

    //
    // Download the image
    //
    if (!dataurl) {
      if (!offersThatNeedPicture.size && !offersThatNeedLogo.size) {
        logger.warn(`offers/image-downloader: orphaned url: ${url}`);
        return null;
      }
      try {
        dataurl = await downloadOneImage(url);
      } catch (e) {
        logger.warn(`offers/image-downloader: Can't fetch '${url}': ${e.message}`);
        return null;
      }
    }

    //
    // Put the image into the offers.
    //
    // The offers were taken from `OffersDB` by reference, so updating
    // an offer object here will also update the in-memory offer inside
    // `OffersDB`. `flushOfferObject` puts the changes into persistence.
    //
    offersThatNeedPicture.forEach((offer) => {
      offer.setPictureDataurl(dataurl);
      this.offersDB.flushOfferObject(offer.uniqueID);
    });
    offersThatNeedLogo.forEach((offer) => {
      offer.setLogoDataurl(dataurl);
      this.offersDB.flushOfferObject(offer.uniqueID);
    });

    return dataurl;
  }
}
