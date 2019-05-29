import Promise from '../core/helpers/promise';
import App from './app';
import utils from '../core/utils';
import config from '../core/config';

global.Promise = Promise;
global.App = App;
global.CliqzUtils = utils;
global.config = config;
