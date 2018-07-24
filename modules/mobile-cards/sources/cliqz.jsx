import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

// TODO: bring back when upgrade react native to 51+
// const CliqzContext = React.createContext(null);

// export const Provider = CliqzContext.Provider;

// export function withCliqz(Component) {
//   // ...and returns another component...
//   return function CliqzedComponent(props) {
//     // ... and renders the wrapped component with the context theme!
//     // Notice that we pass through any additional props as well
//     return (
//       <CliqzContext.Consumer>
//         {cliqz => <Component {...props} cliqz={cliqz} />}
//       </CliqzContext.Consumer>
//     );
//   };
// }


const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    flex: 1,
    flexDirection: 'column',
  }
});

export const Provider = class CliqzProvider extends React.Component {
  getChildContext() {
    return { cliqz: this.props.value };
  }

  render() {
    return <View style={styles.container} {...this.props} />;
  }
};

Provider.childContextTypes = {
  cliqz: PropTypes.object
};

export const withCliqz = (Component) => {
  function CliqzedComponent(props, context) {
    return <Component {...props} cliqz={context.cliqz} />;
  }
  CliqzedComponent.contextTypes = {
    cliqz: PropTypes.object
  };
  return CliqzedComponent;
};
