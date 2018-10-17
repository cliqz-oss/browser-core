// Continued from "../image-diverter.es"
/**
 * The content scripts run in the context of the user's html page.
 * If such a script load images, then third-party privacy extensions
 * might categorize the images as trackers and blacklist Cliqz.
 *
 * If a content script needs an image, it should ask the background
 * context to load it.
 *
 * See also {{#crossLink "core.ImageDiverterBackground"}}{{/crossLink}}
 *
 * @class ImageDiverter
 * @static
 */

/**
 * @method divertImages
 * @param {DOM_element} rootElement
 * @param {map_string,string} classToImage
 *   For each CSS class name to the corresponding background image url
 * @param {(string)=>Promise_string} contentReader
 *   Promise-wrapped version of `ImageDiverterBackground::readContentAsDataUrl`.
 *   Expected is a cross-context call from a content script to the
 *   background context.
 *   Content reader should return an empty string in case of an error,
 *   see the comment to `ImageDiverterBackground::handleReadContentAsDataUrl`.
 * @returns {Promise_arr}  Content readers in action
 */
export function divertImages(rootElement, classToImage, contentReader) {
  const asyncActions = [];
  if (!rootElement) {
    return asyncActions;
  }
  // If `rootElement` is an iframe, unwrap it
  const searchRoot =
    rootElement.contentDocument
    || (rootElement.contentWindow && rootElement.contentWindow.document)
    || rootElement;

  Object.entries(classToImage).forEach(([className, imageUrl]) => {
    const els = searchRoot.getElementsByClassName(className);
    for (const el of els) {
      const action = contentReader(imageUrl).then((dataUrl) => {
        el.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : '';
      }).catch(() => { /* can't do anything */ });
      asyncActions.push(action); // eslint-disable-line no-loop-func
    }
  });
  return asyncActions;
}

/**
 * Helper for content scripts. Create a function, which will call
 * `readContentAsDataUrl` in the background context.
 *
 * @method getImageDiverterCallerFunc
 * @param {object} CLIQZ  Original parameter to the content script
 * @returns {(string)=>Promise_string}
 */
export function getImageDiverterCallerFunc(CLIQZ) {
  return contentUrl =>
    CLIQZ.app.modules.core.action(
      'readContentAsDataUrl',
      contentUrl);
}
