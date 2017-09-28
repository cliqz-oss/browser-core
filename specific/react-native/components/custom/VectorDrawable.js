import PropTypes from 'prop-types';
import { requireNativeComponent, ViewPropTypes } from 'react-native';

const componentInterface = {
  name: 'VectorDrawable',
  propTypes: {
    src: PropTypes.string,
    ...ViewPropTypes // include the default view properties
  },
};

export default requireNativeComponent('VectorDrawable', componentInterface);
