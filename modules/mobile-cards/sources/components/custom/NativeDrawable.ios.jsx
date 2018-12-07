import PropTypes from 'prop-types';
import { requireNativeComponent, ViewPropTypes } from 'react-native';

const componentInterface = {
  name: 'NativeDrawable',
  propTypes: {
    source: PropTypes.string,
    color: PropTypes.string,
    ...ViewPropTypes // include the default view properties
  },
};

export default requireNativeComponent('NativeDrawable', componentInterface);

export function normalizeUrl(url = '', options = {}) {
  const prefix = options.isNative ? '' : 'ic_ez_';
  return prefix + url.slice(url.lastIndexOf('/') + 1, -4).replace(/-/g, '_');
}
