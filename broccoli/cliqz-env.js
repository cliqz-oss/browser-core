'use strict';

const env = (process.env.CLIQZ_ENVIRONMENT || 'development').toUpperCase();

module.exports = {
	[env]: true
};
