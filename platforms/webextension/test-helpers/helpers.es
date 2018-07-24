import { chrome } from '../globals';

export const wrap = getObj => new Proxy({}, {
  get(target, name) {
    const obj = getObj();
    let prop = obj[name];

    if (typeof prop === 'function') {
      prop = prop.bind(obj);
    }
    return prop;
  },
  set(target, name, value) {
    const obj = getObj();
    obj[name] = value;
    return true;
  },
});


export const queryHTML = async (url, selector, attribute, {
  attributeType = 'property',
} = {}) => {
  const window = chrome.extension.getViews().find(w => w.location.href === url);

  if (!window) {
    return [];
  }

  const attributes = attribute.split(',');
  const getAttr = (el, attr) => {
    if (attributeType === 'property') {
      return el[attr];
    }

    return el.getAttribute(attr);
  };

  return Array.prototype.map.call(
    window.document.querySelectorAll(selector),
    (el) => {
      if (attributes.length > 1) {
        return attributes.reduce((hash, attr) => ({
          ...hash,
          [attr]: getAttr(el, attr),
        }), {});
      }

      return getAttr(el, attribute);
    },
  );
};

export function getResourceUrl(module, resource) {
  return chrome.runtime.getURL(`modules/${module}/${resource}`);
}

export const win = wrap(() => chrome.extension.getBackgroundPage().window);

export const app = wrap(() => win.CLIQZ.app);
export const urlBar = wrap(() => { throw new Error('Not implemented'); });
export const lang = wrap(() => { throw new Error('Not implemented'); });
export const popup = wrap(() => { throw new Error('Not implemented'); });
export const $dropdown = wrap(() => { throw new Error('Not implemented'); });
export const CliqzUtils = wrap(() => win.CliqzUtils);
export const CliqzEvents = wrap(() => { throw new Error('Not implemented'); });
export const getComputedStyle = wrap(() => { throw new Error('Not implemented'); });
export const urlbar = wrap(() => { throw new Error('Not implemented'); });
export const blurUrlBar = wrap(() => { throw new Error('Not implemented'); });
export const EventUtils = wrap(() => { throw new Error('Not implemented'); });
export const TIP = wrap(() => { throw new Error('Not implemented'); });
export const clearDB = () => { throw new Error('Not implemented'); };
