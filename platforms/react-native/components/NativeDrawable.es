import PropTypes from 'prop-types';
import { requireNativeComponent, ViewPropTypes } from 'react-native';

const componentInterface = {
  name: 'NativeDrawable',
  propTypes: {
    source: PropTypes.string,
    ...ViewPropTypes // include the default view properties
  },
};

export default requireNativeComponent('NativeDrawable', componentInterface);

export function normalizeUrl(url = '') {
  return 'ic_ez_' + url.slice(url.lastIndexOf('/') + 1, -4).replace(/-/g, '_').toLowerCase();
};
