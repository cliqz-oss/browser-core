import React from 'react';
import themeDetails from './themes';

const ThemeContext = React.createContext(null);

export const Provider = ThemeContext.Provider;

export const withTheme = Component => props => (
  <ThemeContext.Consumer>
    { theme => <Component theme={theme} {...props} /> }
  </ThemeContext.Consumer>
);

export const withStyles = styles => Component => props => (
  <ThemeContext.Consumer>
    { theme => <Component classes={typeof styles === 'function' ? styles(theme, themeDetails) : styles} {...props} /> }
  </ThemeContext.Consumer>
);
