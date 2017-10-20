import PropTypes from 'prop-types';
import { requireNativeComponent, ViewPropTypes } from 'react-native';

const componentInterface = {
  name: 'NativeDrawable',
  propTypes: {
    src: PropTypes.string,
    ...ViewPropTypes // include the default view properties
  },
};

export default requireNativeComponent('NativeDrawable', componentInterface);
