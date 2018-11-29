/*
** Need to create extra file to avoid Dependency cycle eslint -> no-cycle
*/

import React from 'react';

const AppContext = React.createContext();

export default AppContext;
